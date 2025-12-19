import { PropertyType } from "$lib/property/property.svelte";
import CheckboxProperty from "./properties/CheckboxProperty.svelte";
import SliderProperty from "./properties/SliderProperty.svelte";
import NumberProperty from "./properties/SliderProperty.svelte";
import TextInputProperty from "./properties/TextInputProperty.svelte";
import StringProperty from "./properties/TextInputProperty.svelte";
import WidgetInspector from "./WidgetInspector.svelte";

export enum Menu {
    Widget = "Widget",
    Board = "Board",
    Server = "Server",
    Global = "Global"
};

export const menuComponents = {
    [Menu.Widget]: WidgetInspector,
    [Menu.Board]: null,
    [Menu.Server]: null,
    [Menu.Global]: null
};

export const menuState = $state({
    currentMenu: Menu.Widget
});

export const propertiesInspectorClass = {
    [PropertyType.INTEGER]: SliderProperty,
    [PropertyType.STRING]: TextInputProperty,
    [PropertyType.FLOAT]: SliderProperty,
    [PropertyType.BOOLEAN]: CheckboxProperty
}