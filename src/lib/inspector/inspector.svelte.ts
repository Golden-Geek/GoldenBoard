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