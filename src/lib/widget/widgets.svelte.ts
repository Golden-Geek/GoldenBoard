import { saveData, type ContextMenuItem } from '../engine.svelte.ts';
import type { PropertyContainerDefinition, PropertySingleDefinition, PropertyContainerData, PropertyData } from '../property.svelte.ts';
import { getPropsFromDefinitions, InspectableWithProps, PropertyType } from '../property.svelte.ts';

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
    isContainer: boolean = false;
    isSelected: boolean = $state(false);

    //derived properties
    label = $derived(this.getPropRawValue("label.text") as string);

    constructor(type: string, isContainer?: boolean) {
        super('widget');

        this.isContainer = isContainer ?? false;
        if (this.isContainer) this.children = [];
        this.type = type;
        const def = getDefinitionForType(type);
        this.icon = def?.icon;

        registerWidget(this);
    }

    cleanup() {

        unregisterWidget(this.id);

        if (this.isContainer && this.children) {
            for (let child of this.children) {
                child.cleanup();
            }
        }
    }

    static createFromDefinition(def: WidgetDefinition): Widget {

        let w = new Widget(def.type, def.isContainer || false);
        w.props = getPropsFromDefinitions(def.props || {});
        w.setPropRawValue('label.text', def.name);
        return w;
    }

    static createRootWidgetContainer(): Widget {
        return Widget.createFromDefinition(widgetContainerDefinitions[0]);
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
            this.children = data.children.map((dataChild: any) => {
                let child = this.children!.find(c => c.id === dataChild.id);

                if (!child) {
                    child = this.addWidget(dataChild.type, false);
                }

                child.applySnapshot(dataChild);
                return child;
            });
        } else {
            this.children = null;
        }
    }

    duplicate(): Widget | undefined {
        if (this.parent === null) return undefined;

        let widget = new Widget(this.type, this.isContainer);
        widget.applySnapshot(this.toSnapshot(false));
        this.parent.addWidget(widget);

        saveData("Duplicate Widget " + this.getName());
        return widget;
    }


    addWidget(typeOrChild: string | Widget, save: boolean = true): Widget {

        let child: Widget;
        if (typeof typeOrChild === 'string') {
            child = new Widget(typeOrChild);
        } else {
            child = typeOrChild;
        }

        if (!this.isContainer) {
            throw new Error("Cannot add widget to non-container widget");
        }

        if (!this.children) {
            this.children = [];
        }

        this.children.push(child);
        child.parent = this;

        if (save) {
            saveData("Add Widget " + child.getName());
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
            saveData("Remove Widget " + this.getName());
        }
    }

    toggleSelect() {
        this.select(!this.isSelected, false);
    }

    select(doSelect: boolean = true, clearSelection: boolean = true) {

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
    }

    selectToThis() {

        if (selectedWidgets.length === 0) {
            this.select(true, false);
            return;
        }

        let lastSelected = selectedWidgets[selectedWidgets.length - 1];
        if (lastSelected.parent !== this.parent) {
            this.select(true, false);
            return;
        }
        if (!this.parent || !this.parent.children) {
            this.select(true, false);
            return;
        }

        let siblings = this.parent.children;
        let startIndex = siblings.indexOf(lastSelected);
        let endIndex = siblings.indexOf(this);
        if (startIndex === -1 || endIndex === -1) {
            this.select(true, false);
            return;
        }

        let start = Math.min(startIndex, endIndex);
        let end = Math.max(startIndex, endIndex);
        for (let i = start; i <= end; i++) {
            siblings[i].select(true, false);
        }
    }

    getName(): string {
        return ((this.props['label'] as PropertyContainerData)?.children?.text as PropertyData)?.value as string || this.type;
    }

    toString(): string {
        return `Widget(${this.getName()}, type=${this.type}, id=${this.id})`;
    }
};

export const widgetsMap: { [key: string]: Widget } = $state({});
export const selectedWidgets: Widget[] = $state([]);

export const deselectAllWidgets = function () {
    for (let w of selectedWidgets) {
        w.isSelected = false;
    }
    selectedWidgets.length = 0;
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

const globalWidgetProperties: { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) } = {

    readOnly: { name: 'Read Only', type: PropertyType.BOOLEAN, default: false } as PropertySingleDefinition,
    label: {
        name: 'Label', children: {
            showLabel: { name: 'Show Label', type: PropertyType.BOOLEAN, default: true } as PropertySingleDefinition,
            text: { name: 'Text', type: PropertyType.STRING, default: '' } as PropertySingleDefinition,
            fontSize: { name: 'Font Size', type: PropertyType.INTEGER, default: 14 } as PropertySingleDefinition,
            labelPlacement: { name: 'Label Placement', type: PropertyType.ENUM, default: 'inside', options: ['top', 'bottom', 'left', 'right', 'inside'] } as PropertySingleDefinition,
        }
    },
    position: {
        name: 'Position', collapsedByDefault: true, children: {
            left: { name: 'Left', type: PropertyType.CSSSIZE, default: 0 } as PropertySingleDefinition,
            top: { name: 'Top', type: PropertyType.CSSSIZE, default: 0 } as PropertySingleDefinition,
            right: { name: 'Right', type: PropertyType.CSSSIZE, default: 0 } as PropertySingleDefinition,
            bottom: { name: 'Bottom', type: PropertyType.CSSSIZE, default: 0 } as PropertySingleDefinition,
            width: { name: 'Width', type: PropertyType.CSSSIZE, default: 100 } as PropertySingleDefinition,
            height: { name: 'Height', type: PropertyType.CSSSIZE, default: 100 } as PropertySingleDefinition,
        }
    }
};

const rangeContainerDefinition: PropertyContainerDefinition = {
    name: 'Range', children: {
        min: { name: 'Min', type: PropertyType.FLOAT, default: 0 } as PropertySingleDefinition,
        max: { name: 'Max', type: PropertyType.FLOAT, default: 100 } as PropertySingleDefinition,
        step: { name: 'Step', type: PropertyType.FLOAT, default: 1 } as PropertySingleDefinition,
    }
};

export const widgetDefinitions: WidgetDefinition[] = [
    {
        name: 'Button', icon: '🔘', type: 'button', description: 'A clickable button widget', props: {
            ...globalWidgetProperties,
            value: { name: 'Value', type: PropertyType.BOOLEAN, default: false } as PropertySingleDefinition
        }

    },
    {
        name: 'Slider', icon: '🎚️', type: 'slider', description: 'A slider widget for selecting a value within a range', props: {
            ...globalWidgetProperties,
            value: { name: 'Value', type: PropertyType.FLOAT, default: 0 } as PropertySingleDefinition,
            range: rangeContainerDefinition
        }
    },
    {
        name: 'ColorPicker', icon: '🎨', type: 'color-picker', description: 'A widget for selecting colors', props: {
            ...globalWidgetProperties,
            value: { name: 'Value', type: PropertyType.COLOR, default: '#ffffffff' } as PropertySingleDefinition
        }
    },
    {
        name: 'Text Input', icon: '⌨️', type: 'text-input', description: 'A widget for entering text', props: {
            ...globalWidgetProperties,
            value: { name: 'Value', type: PropertyType.STRING, default: '' } as PropertySingleDefinition,
            placeholder: { name: 'Placeholder', type: PropertyType.STRING, default: 'Enter text...' } as PropertySingleDefinition,
        }
    },
    {
        name: 'Checkbox', icon: '☑️', type: 'checkbox', description: 'A widget for toggling a boolean value', props: {
            ...globalWidgetProperties,
            value: { name: 'Value', type: PropertyType.BOOLEAN, default: false } as PropertySingleDefinition
        }
    },
    {
        name: 'Dropdown', icon: '⬇️', type: 'dropdown', description: 'A widget for selecting an option from a dropdown list', props: {
            ...globalWidgetProperties,
            value: { name: 'Value', type: PropertyType.ENUM, default: 'option1', options: ['option1', 'option2', 'option3'] } as PropertySingleDefinition
        }
    },
    {
        name: 'Numeric Stepper', icon: '🔢', type: 'numeric-stepper', description: 'A widget for incrementing or decrementing a numeric value', props: {
            ...globalWidgetProperties,
            value: { name: 'Value', type: PropertyType.INTEGER, default: 0 } as PropertySingleDefinition,
            range: rangeContainerDefinition
        }
    },
    {
        name: 'Button Bar', icon: '🔳', type: 'button-bar', description: 'A widget that displays a bar of buttons', props: {
            ...globalWidgetProperties,
            value: { name: 'Value', type: PropertyType.ENUM, default: 'option1', options: ['option1', 'option2', 'option3'] } as PropertySingleDefinition,
            orientation: { name: 'Orientation', type: PropertyType.ENUM, default: 'horizontal', options: ['horizontal', 'vertical'] } as PropertySingleDefinition,
            showLabels: { name: 'Show Labels', type: PropertyType.BOOLEAN, default: true } as PropertySingleDefinition
        }
    },
    {
        name: 'Label', icon: '🏷️', type: 'label', props: {
            ...globalWidgetProperties,
            text: { name: 'Text', type: PropertyType.STRING, default: 'Label' } as PropertySingleDefinition,
            fontSize: { name: 'Font Size', type: PropertyType.INTEGER, default: 14 } as PropertySingleDefinition,
        }
    }];

export const widgetContainerDefinitions: WidgetDefinition[] = [
    {
        name: 'Container', icon: '📦', isContainer: true, type: 'container', description: 'A basic container widget that can hold other widgets in different layouts', props: {
            layout: { name: 'Layout', type: PropertyType.ENUM, default: 'vertical', options: ['vertical', 'horizontal', 'grid', 'free', 'custom'] } as PropertySingleDefinition
        }
    },
    {
        name: 'Tab Container', icon: '📑', isContainer: true, type: 'tab-container', description: 'A container widget that organizes its children into tabs', props: {
            tabPosition: { name: 'Tab Position', type: PropertyType.ENUM, default: 'top', options: ['top', 'bottom', 'left', 'right'] } as PropertySingleDefinition
        }
    },
    {
        name: 'Accordion', icon: '📂', isContainer: true, type: 'accordion', description: 'A container widget that organizes its children into collapsible sections', props: {
            allowMultipleOpen: { name: 'Allow Multiple Open', type: PropertyType.BOOLEAN, default: false } as PropertySingleDefinition
        }
    }
];

const getDefinitionForType = function (type: string): WidgetDefinition | undefined {
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
