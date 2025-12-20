import { PropertyType } from "$lib/property/property.svelte";
import CheckboxProperty from "./properties/CheckboxProperty.svelte";
import ColorPickerProperty from "./properties/ColorPickerProperty.svelte";
import CSSSizeProperty from "./properties/CSSSizeProperty.svelte";
import DropdownProperty from "./properties/DropdownProperty.svelte";
import IconProperty from "./properties/IconProperty.svelte";
import NumberProperty from "./properties/NumberProperty.svelte";
import TextInputProperty from "./properties/TextInputProperty.svelte";

export enum Menu {
    Widget = "Widget",
    Board = "Board",
    Server = "Server",
    Global = "Global"
};

export const propertiesInspectorClass = {
    [PropertyType.INTEGER]: NumberProperty,
    [PropertyType.STRING]: TextInputProperty,
    [PropertyType.FLOAT]: NumberProperty,
    [PropertyType.BOOLEAN]: CheckboxProperty,
    [PropertyType.CSSSIZE]: CSSSizeProperty,
    [PropertyType.COLOR]: ColorPickerProperty,
    [PropertyType.ENUM]: DropdownProperty,
    [PropertyType.ICON]: IconProperty,
    [PropertyType.TEXT]: TextInputProperty

}