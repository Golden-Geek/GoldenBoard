import { PropertyType } from "$lib/property/property.svelte";
import CheckboxProperty from "./properties/CheckboxProperty.svelte";
import ColorPickerProperty from "./properties/ColorPickerProperty.svelte";
import CSSSizeProperty from "./properties/CSSSizeProperty.svelte";
import DropdownProperty from "./properties/DropdownProperty.svelte";
import IconProperty from "./properties/IconProperty.svelte";
import NumberProperty from "./properties/NumberProperty.svelte";
import TextEditorProperty from "./properties/TextEditorProperty.svelte";
import TextInputProperty from "./properties/TextInputProperty.svelte";

export enum Menu {
    Widget = "Widget",
    Board = "Board",
    Server = "Server",
    Global = "Global"
};

export const propertiesInspectorClass = {
    [PropertyType.INTEGER]: { component: NumberProperty },
    [PropertyType.STRING]: { component: TextInputProperty },
    [PropertyType.FLOAT]: { component: NumberProperty },
    [PropertyType.BOOLEAN]: { component: CheckboxProperty },
    [PropertyType.CSSSIZE]: { component: CSSSizeProperty },
    [PropertyType.COLOR]: { component: ColorPickerProperty },
    [PropertyType.ENUM]: { component: DropdownProperty },
    [PropertyType.ICON]: { component: IconProperty },
    [PropertyType.TEXT]: { component: TextEditorProperty, useFullSpace: true }

}