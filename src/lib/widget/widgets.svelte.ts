import { Menu } from '../inspector/inspector.svelte.ts';
import { mainState, menuContext, MenuContextType, saveData, type ContextMenuItem } from '../engine/engine.svelte.ts';
import type { PropertyContainer, PropertyContainerDefinition, PropertySingleDefinition } from '../property/property.svelte.ts';
import { Property, PropertyMode, PropertyType } from '../property/property.svelte.ts';
import { ColorUtil, type Color } from '$lib/property/Color.svelte';
import { InspectableWithProps, sanitizeUserID } from "../property/inspectable.svelte.ts";
import { Board } from "$lib/board/boards.svelte.js";

//WIDGET
type WidgetDefinition = {
    name: string;
    description?: string;
    icon: string;
    type: string;
    isContainer?: boolean;
    props?: {
        [key: string]: PropertySingleDefinition | PropertyContainerDefinition
    }
};

export class Widget extends InspectableWithProps {

    type: string = $state('');
    parent: Widget | null = $state(null);
    children: Widget[] | null = $state(null);

    icon?: string = $state('');
    isRoot: boolean = $derived(this.parent === null);
    isContainer: boolean = $state(false);
    isSelected: boolean = $state(false);


    //derived properties
    name = $derived(this.getSingleProp('label.text').get() as string);
    sanitizedIdentifier = $derived.by(() => {
        if (this.userID != '') return this.userID;

        const p = this.getSingleProp('label.text');
        if (p.mode === PropertyMode.EXPRESSION) return p.getRaw() as string; //safety to avoid circular calls
        return sanitizeUserID(this.name) as string;
    });

    labelColor = $derived(this.getSingleProp('label.color').get() as Color);

    constructor(type: string, isContainer?: boolean, id?: string) {
        super('widget', id);
        this.type = type;

        this.isContainer = isContainer ?? false;
        if (this.isContainer) this.children = [];
        const def = getWidgetDefinitionForType(type);
        this.icon = def?.icon;

        this.setupProps();
        registerWidget(this);
    }

    cleanup() {
        super.cleanup();
        selectedWidgets.splice(selectedWidgets.indexOf(this), 1);
        unregisterWidget(this.id);

        if (this.isContainer && this.children) {
            for (let child of this.children) {
                child.cleanup();
            }
        }
    }

    setID(newID: string) {
        unregisterWidget(this.id);
        this.id = newID;
        registerWidget(this);
    }

    getAutoID(): string {
        return this.getFullPath();
    }

    getFullPath(): string {
        let path = this.sanitizedIdentifier;
        let p: Widget | null = this.parent;
        while (p) {
            path = p.sanitizedIdentifier + '.' + path;
            p = p.parent;
        }

        return path;
    }

    static createFromDefinition(def: WidgetDefinition): Widget {

        let w = new Widget(def.type, def.isContainer || false);
        (w.getProp('label.text') as Property | null)?.setRaw(def.name);
        return w;
    }

    static createRootWidgetContainer(): Widget {
        let w = Widget.createFromDefinition(widgetContainerDefinitions[0]);
        let p = w.getSingleProp('label.text');
        if (p) {
            p.set('Root');
            p.enabled = true;
        }
        return w;
    }


    getPropertyDefinitions(): { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition); } | null {
        return { ...super.getPropertyDefinitions(), ...getWidgetDefinitionForType(this.type)?.props || null };
    }

    toSnapshot(includeID: boolean = true): any {
        let data = super.toSnapshot(includeID);
        data.type = this.type;
        if (this.isContainer && this.children) {
            data.children = this.children.map(c => c.toSnapshot());
        }
        return data;
    }

    applySnapshot(data: any) {
        super.applySnapshot(data);

        this.type = data.type;
        this.isContainer = data.children !== undefined;
        if (this.isContainer && data.children) {
            if (!this.children) this.children = [];

            //need to list all removed children to unregister them
            const removedChildren = this.children.filter(c => !data.children.find((dataChild: any) => dataChild.id === c.id));
            for (let removedChild of removedChildren) {
                removedChild.cleanup();
            }

            this.children = data.children.map((dataChild: any) => {
                let child = this.children!.find(c => c.id === dataChild.id);

                if (!child) {
                    child = this.addWidget(dataChild.type, { select: false, save: false, id: dataChild.id });
                }

                child.applySnapshot(dataChild);
                return child;
            });
        } else {
            this.children = null;
        }
    }

    duplicate(options?: { save?: boolean, select?: boolean }): Widget | undefined {
        if (this.parent === null) return undefined;

        let widget = new Widget(this.type, this.isContainer);
        widget.applySnapshot(this.toSnapshot(false));
        this.parent.addWidget(widget, { select: false, save: false, after: this });

        if (options?.select ?? true) {
            widget.select(true);
        }
        if (options?.save ?? true) saveData("Duplicate Widget " + this.name);
        return widget;
    }


    addWidget(typeOrChild: string | Widget, options?: { select?: boolean, save?: boolean, id?: string, after?: Widget }): Widget {

        let child: Widget;
        if (typeof typeOrChild === 'string') {
            child = new Widget(typeOrChild, false, options?.id ?? undefined);
        } else {
            child = typeOrChild;
        }

        let save = options?.save ?? true;
        if (!this.isContainer) {
            if (!this.parent) {
                throw new Error("Cannot add widget to non-container widget without parent");
            }
            return this.parent.addWidget(child, options);
        }

        if (!this.children) {
            this.children = [];
        }

        let afterWidget = options?.after;
        if (afterWidget) {
            let index = this.children.indexOf(afterWidget);
            if (index === -1) {
                throw new Error("After widget not found in container");
            }
            this.children.splice(index + 1, 0, child);
            child.parent = this;
        } else {
            this.children.push(child);
            child.parent = this;
        }

        if (options?.select ?? true) {
            child.select(true, true, false);
        }

        if (save) {
            saveData("Add Widget " + child.name);
        }

        return child;
    }

    removeWidget(child: Widget) {
        if (!this.isContainer || !this.children) {
            throw new Error("Cannot remove widget from non-container widget");
        }

        const index = this.children.indexOf(child);
        if (index === -1) {
            throw new Error("Widget not found in container");
        }

        this.children.splice(index, 1);
    }

    remove(save: boolean = true) {
        if (!this.parent) return;
        this.parent.removeWidget(this);
        this.parent = null;
        this.cleanup();
        if (save) {
            saveData("Remove Widget " + this.name);
        }
    }

    toggleSelect() {
        this.select(!this.isSelected, false);
    }

    select(doSelect: boolean = true, clearSelection: boolean = true, save: boolean = true) {
        if (this.isSelected === doSelect && !clearSelection) return;

        if (doSelect && clearSelection) {
            deselectAllWidgets();
        }

        this.isSelected = doSelect;
        if (doSelect) {
            if (!selectedWidgets.includes(this))
                selectedWidgets.push(this);
        } else {
            const index = selectedWidgets.indexOf(this);
            if (index !== -1) {
                selectedWidgets.splice(index, 1);
            }
        }
        mainState.editor.inspectorMenu = Menu.Widget;
        if (save) {
            saveData("Select Widget", { coalesceID: 'select-widget' });
        }
    }

    selectToThis(save: boolean = true) {

        if (selectedWidgets.length === 0) {
            this.select(true, false, save);
            return;
        }

        let lastSelected = selectedWidgets[selectedWidgets.length - 1];
        if (lastSelected.parent !== this.parent) {
            this.select(true, false, save);
            return;
        }
        if (!this.parent || !this.parent.children) {
            this.select(true, false, save);
            return;
        }

        let siblings = this.parent.children;
        let startIndex = siblings.indexOf(lastSelected);
        let endIndex = siblings.indexOf(this);
        if (startIndex === -1 || endIndex === -1) {
            this.select(true, false, save);
            return;
        }

        let start = Math.min(startIndex, endIndex);
        let end = Math.max(startIndex, endIndex);
        for (let i = start; i <= end; i++) {
            siblings[i].select(true, false, false);
        }

        menuContext.type = MenuContextType.Widget;
        if (save) {
            saveData("Select To Widget", { coalesceID: 'select-widget' });
        }
    }

    toString(): string {
        return `Widget(${this.name}, type=${this.type}, id=${this.id})`;
    }
};

export const widgetsMap: { [key: string]: Widget } = $state({});
export const selectedWidgets: Widget[] = $state([]);

export const selectWidgets = function (widgets: Widget[], clearSelection: boolean = true, save: boolean = true) {
    if (clearSelection) {
        deselectAllWidgets();
    }
    for (let w of widgets) {
        w.select(true, false, save);
    }
};

export const deselectAllWidgets = function () {
    for (let w of selectedWidgets) {
        w.isSelected = false;
    }
    while (selectedWidgets.length > 0) {
        selectedWidgets.pop();
    }

}


export function registerWidget(obj: Widget) {
    widgetsMap[obj.id] = obj;
}

export function unregisterWidget(id: string) {
    delete widgetsMap[id];
}

export function getWidgetByID(id: string | null): Widget | undefined {
    if (!id) return undefined;
    return widgetsMap[id];
}

function getGlobalWidgetProperties(name: string): { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) } {

    return {
        readOnly: { name: 'Read Only', type: PropertyType.BOOLEAN, default: false, canDisable: true },
        label: {
            name: 'Label', color: '#d98d13ff', children: {
                showLabel: { name: 'Show Label', type: PropertyType.BOOLEAN, default: true, description: 'Whether to show the label', canDisable: true },
                text: { name: 'Text', type: PropertyType.STRING, default: name, canDisable: true },
                fontSize: { name: 'Font Size', type: PropertyType.CSSSIZE, default: '10px', canDisable: true },
                color: { name: 'Color', type: PropertyType.COLOR, default: ColorUtil.fromHex("#ffffffff"), canDisable: true },
                labelPlacement: { name: 'Label Placement', type: PropertyType.ENUM, default: 'inside', options: { 'top': 'Top', 'bottom': 'Bottom', 'left': 'Left', 'right': 'Right', 'inside': 'Inside' }, canDisable: true },
            }
        },
        position: {
            name: 'Position', color: '#1a73e8ff', collapsedByDefault: true, visible: (i, p) => !i.isRoot, children: {
                left: { name: 'Left', type: PropertyType.CSSSIZE, default: 0, canDisable: true, visible: (i, p) => i.parent?.getSingleProp('layout').get() == 'free' || false },
                top: { name: 'Top', type: PropertyType.CSSSIZE, default: 0, canDisable: true, visible: (i, p) => i.parent?.getSingleProp('layout').get() == 'free' || false },
                right: { name: 'Right', type: PropertyType.CSSSIZE, default: 0, canDisable: true, visible: (i, p) => i.parent?.getSingleProp('layout').get() == 'free' || false },
                bottom: { name: 'Bottom', type: PropertyType.CSSSIZE, default: 0, canDisable: true, visible: (i, p) => i.parent?.getSingleProp('layout').get() == 'free' || false },
                width: { name: 'Width', type: PropertyType.CSSSIZE, default: 100, canDisable: true },
                height: { name: 'Height', type: PropertyType.CSSSIZE, default: 20, canDisable: true },
            }
        }
    }
};

const rangeContainerDefinition: PropertyContainerDefinition = {
    name: 'Range', collapsedByDefault: true, children: {
        min: { name: 'Min', type: PropertyType.FLOAT, default: 0, canDisable: true },
        max: { name: 'Max', type: PropertyType.FLOAT, default: 1, canDisable: true, min: (i, p) => i.getSingleProp('range.min').get() + 0.00001 },
        step: { name: 'Step', type: PropertyType.FLOAT, default: 0, canDisable: true },
    }
};

export const widgetDefinitions: WidgetDefinition[] = [
    {
        name: 'Button', icon: '🔘', type: 'button', description: 'A clickable button widget', props: {
            ...getGlobalWidgetProperties('Button'),
            value: { name: 'Value', type: PropertyType.BOOLEAN, default: false }
        }

    },
    {
        name: 'Slider', icon: '🎚️', type: 'slider', description: 'A slider widget for selecting a value within a range', props: {
            ...getGlobalWidgetProperties('Slider'),
            value: {
                name: 'Value', type: PropertyType.FLOAT, default: 0,
                min: (i, p) => i.getSingleProp('range.min').get(),
                max: (i, p) => i.getSingleProp('range.max').get(),
                step: (i, p) => i.getSingleProp('range.step').get()
            },
            range: rangeContainerDefinition
        }
    },
    {
        name: 'ColorPicker', icon: '🎨', type: 'color-picker', description: 'A widget for selecting colors', props: {
            ...getGlobalWidgetProperties('ColorPicker'),
            value: { name: 'Value', type: PropertyType.COLOR, default: ColorUtil.fromHex("#ffffffff") }
        }
    },
    {
        name: 'Text Input', icon: '⌨️', type: 'text-input', description: 'A widget for entering text', props: {
            ...getGlobalWidgetProperties('Text Input'),
            value: { name: 'Value', type: PropertyType.STRING, default: '' },
            placeholder: { name: 'Placeholder', type: PropertyType.STRING, default: 'Enter text...' },
        }
    },
    {
        name: 'Checkbox', icon: '☑️', type: 'checkbox', description: 'A widget for toggling a boolean value', props: {
            ...getGlobalWidgetProperties('Checkbox'),
            value: { name: 'Value', type: PropertyType.BOOLEAN, default: false }
        }
    },
    {
        name: 'Dropdown', icon: '⬇️', type: 'dropdown', description: 'A widget for selecting an option from a dropdown list', props: {
            ...getGlobalWidgetProperties('Dropdown'),
            value: { name: 'Value', type: PropertyType.ENUM, default: 'option1', options: { 'option1': 'Option 1', 'option2': 'Option 2', 'option3': 'Option 3' } }
        }
    },
    {
        name: 'Numeric Stepper', icon: '🔢', type: 'numeric-stepper', description: 'A widget for incrementing or decrementing a numeric value', props: {
            ...getGlobalWidgetProperties('Numeric Stepper'),
            value: { name: 'Value', type: PropertyType.INTEGER, default: 0 },
            range: rangeContainerDefinition
        }
    },
    {
        name: 'Button Bar', icon: '🔳', type: 'button-bar', description: 'A widget that displays a bar of buttons', props: {
            ...getGlobalWidgetProperties('Button Bar'),
            value: { name: 'Value', type: PropertyType.ENUM, default: 'option1', options: { 'option1': 'Option 1', 'option2': 'Option 2', 'option3': 'Option 3' } },
            orientation: { name: 'Orientation', type: PropertyType.ENUM, default: 'horizontal', options: { 'horizontal': 'Horizontal', 'vertical': 'Vertical' } },
            showLabels: { name: 'Show Labels', type: PropertyType.BOOLEAN, default: true }
        }
    },
    {
        name: 'Comment', icon: '🏷️', type: 'comment', description: 'A comment text', props: {
            ...getGlobalWidgetProperties('Comment'),
            text: { name: 'Text', type: PropertyType.STRING, default: 'Comment' },
            fontSize: { name: 'Font Size', type: PropertyType.INTEGER, default: 14, canDisable: true },
        }
    }];

export const widgetContainerDefinitions: WidgetDefinition[] = [
    {
        name: 'Container', icon: '📦', isContainer: true, type: 'container', description: 'A basic container widget that can hold other widgets in different layouts', props: {
            ...getGlobalWidgetProperties('Container'),
            layout: { name: 'Layout', type: PropertyType.ENUM, default: 'vertical', options: { 'vertical': 'Vertical', 'horizontal': 'Horizontal', 'grid': 'Grid', 'free': 'Free', 'custom': 'Custom' } }
        }
    },
    {
        name: 'Tab Container', icon: '📑', isContainer: true, type: 'tab-container', description: 'A container widget that organizes its children into tabs', props: {
            ...getGlobalWidgetProperties('Tab Container'),
            tabPosition: { name: 'Tab Position', type: PropertyType.ENUM, default: 'top', options: { 'top': 'Top', 'bottom': 'Bottom', 'left': 'Left', 'right': 'Right' } }
        }
    },
    {
        name: 'Accordion', icon: '📂', isContainer: true, type: 'accordion', description: 'A container widget that organizes its children into collapsible sections', props: {
            ...getGlobalWidgetProperties('Accordion'),
            allowMultipleOpen: { name: 'Allow Multiple Open', type: PropertyType.BOOLEAN, default: false }
        }
    }
];

export const getWidgetDefinitionForType = function (type: string): WidgetDefinition | undefined {
    for (let def of [...widgetDefinitions, ...widgetContainerDefinitions]) {
        if (def.type === type) {
            return def;
        }
    }
    return undefined;
}

export const getWidgetAddMenuItems = function (source: any = null): ContextMenuItem[] {

    return [...widgetContainerDefinitions, ...widgetDefinitions].map(def => ({
        label: def.name,
        icon: def.icon,
        action: (source: any = null) => {
            let w = source as Widget;
            w.addWidget(Widget.createFromDefinition(def));
        }
    }));
};

export const getWidgetConversionMenuItems = function (source: Widget): ContextMenuItem[] {

    let defArray = source.isContainer ? widgetContainerDefinitions : widgetDefinitions;
    let result = defArray.map(def => ({
        label: def.name,
        icon: def.icon,
        action: (source: any = null) => {
            let w = source as Widget;
            let parent = w.parent;
            if (!parent) return;
        }
    }));

    return result;
};

export const getWidgetContextMenuItems = function (source: any): ContextMenuItem[] {
    let w = source as Widget;
    let isContainer = w.isContainer;
    let isRoot = w.isRoot;
    let result = [] as ContextMenuItem[];
    if (isContainer) {
        result.push({ label: 'Add Widget', icon: '➕', submenu: () => getWidgetAddMenuItems(source) });
    }

    if (!isRoot) {
        result.push(
            { separator: true },
            { label: 'Delete Widget', icon: '❌', action: (source: any) => { (source as Widget).remove(); } },
            { label: 'Duplicate Widget', icon: '📄', action: (source: any) => { (source as Widget).duplicate() } },
            { separator: true },
            {
                label: 'Convert to ...', icon: '🔄',
                submenu:
                    () => getWidgetConversionMenuItems(source as Widget)
            }
        );
    }

    return result;
};
