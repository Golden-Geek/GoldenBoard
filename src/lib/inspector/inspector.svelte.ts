import { PropertyType } from "$lib/property/property.svelte";
import CheckboxProperty from "./properties/CheckboxProperty.svelte";
import ColorPickerProperty from "./properties/ColorPickerProperty.svelte";
import DropdownProperty from "./properties/DropdownProperty.svelte";
import IconProperty from "./properties/IconProperty.svelte";
import SliderProperty from "./properties/SliderProperty.svelte";
import TextInputProperty from "./properties/TextInputProperty.svelte";
import WidgetInspector from "./WidgetInspector.svelte";

export enum Menu {
    Widget = "Widget",
    Board = "Board",
    Server = "Server",
    Global = "Global"
};

export const menuState = $state({
    currentMenu: Menu.Widget
});

export const propertiesInspectorClass = {
    [PropertyType.INTEGER]: SliderProperty,
    [PropertyType.STRING]: TextInputProperty,
    [PropertyType.FLOAT]: SliderProperty,
    [PropertyType.BOOLEAN]: CheckboxProperty,
    [PropertyType.CSSSIZE]: TextInputProperty,
    [PropertyType.COLOR]: ColorPickerProperty,
    [PropertyType.ENUM]: DropdownProperty,
    [PropertyType.ICON]: IconProperty,
    [PropertyType.TEXT]: TextInputProperty

}