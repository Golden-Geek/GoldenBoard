import type { PropertyContainerDefinition, PropertySingleDefinition, PropertyContainerData, PropertyData } from '../property.svelte.ts';
import { PropertyType } from '../property.svelte.ts';

//WIDGET
type WidgetDefinition = {
    name: string;
    description?: string;
    icon: string;
    type: string;
    props?: {
        [key: string]: PropertySingleDefinition | PropertyContainerDefinition
    }
};


export type WidgetData = {
    id: string;
    type: string;
    props: {
        [key: string]: (PropertyData | PropertyContainerData)
    };
};

export type WidgetContainerData = WidgetData & {
    children: WidgetData[];
};

export const rootWidgetContainerData: WidgetContainerData = {
    id: 'widget-' + crypto.randomUUID(),
    type: "container",
    props: {
        label: { children: { text: { value: 'Root' } } }
    },
    children: []
};

const globalWidgetProperties: { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) } = {

    readOnly: { name: 'Read Only', type: PropertyType.BOOLEAN, default: false } as PropertySingleDefinition,
    label: {
        name: 'Label', children: {
            showLabel: { name: 'Show Label', type: PropertyType.BOOLEAN, default: true } as PropertySingleDefinition,
            text: { name: 'Text', type: PropertyType.STRING, default: 'Click Me' } as PropertySingleDefinition,
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
            value: { name: 'Value', type: PropertyType.RANGE, default: 0 } as PropertySingleDefinition,
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
        name: 'Container', icon: '📦', type: 'container', description: 'A basic container widget that can hold other widgets in different layouts', props: {
            layout: { name: 'Layout', type: PropertyType.ENUM, default: 'vertical', options: ['vertical', 'horizontal', 'grid', 'free', 'custom'] } as PropertySingleDefinition
        }
    },
    {
        name: 'Tab Container', icon: '📑', type: 'tab-container', description: 'A container widget that organizes its children into tabs', props: {
            tabPosition: { name: 'Tab Position', type: PropertyType.ENUM, default: 'top', options: ['top', 'bottom', 'left', 'right'] } as PropertySingleDefinition
        }
    },
    {
        name: 'Accordion', icon: '📂', type: 'accordion', description: 'A container widget that organizes its children into collapsible sections', props: {
            allowMultipleOpen: { name: 'Allow Multiple Open', type: PropertyType.BOOLEAN, default: false } as PropertySingleDefinition
        }
    }
]; 