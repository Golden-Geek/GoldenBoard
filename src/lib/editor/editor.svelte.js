import Container from "./components/containers/Container.svelte";
import Button from "./components/parameters/Button.svelte";
import Slider from "./components/parameters/Slider.svelte";
import Toggle from "./components/parameters/Toggle.svelte";
import Rotary from "./components/parameters/Rotary.svelte";
import Dropdown from "./components/parameters/Dropdown.svelte";
import Pad from "./components/parameters/Pad.svelte";

import StringPropertyEditor from "./inspector/property/editors/StringPropertyEditor.svelte";
import SelectPropertyEditor from "./inspector/property/editors/SelectPropertyEditor.svelte";
import IntPropertyEditor from "./inspector/property/editors/IntPropertyEditor.svelte";
import SliderPropertyEditor from "./inspector/property/editors/SliderPropertyEditor.svelte";
import CssSizeEditor from "./inspector/property/editors/CSSSizeEditor.svelte";


export const editorState = $state(
    {
        selectedComponents: [],
        editMode: true,
        inspectorOpen: true,
        outlinerOpen: true,
        selectedBoard: null,
    }
);

export const layoutTypes = {
    FREE: "free",
    HORIZONTAL: "horizontal",
    VERTICAL: "vertical",
    GRID: "grid",
    CUSTOM: "custom"
};

export const propertyEditors = {
    string: StringPropertyEditor,
    int: IntPropertyEditor,
    number: SliderPropertyEditor,
    boolean: StringPropertyEditor,
    select: SelectPropertyEditor,
    csssize: CssSizeEditor,
};

export const componentTypes = {
    "container": {
        name: "Container", type: Container,
        options: {
            layout: {
                type: "select",
                options: [layoutTypes.HORIZONTAL, layoutTypes.FREE, layoutTypes.VERTICAL, layoutTypes.GRID]
            },
            style:
            {
                gap: {
                    type: "csssize",
                    default: "5px"
                }
            }
        }, oscTypes: []
        , icon: "📦"
    },
    "slider": { name: "Slider", type: Slider, options: { test: { type: "number", default: "3px" } }, oscTypes: ["f"], icon: "🎚️" },
    "button": { name: "Button", type: Button, options: {}, oscTypes: ["N", "I"], icon: "🔘" },
    "toggle": { name: "Toggle", type: Toggle, options: {}, oscTypes: ["T", "F"], icon: "🔄" },
    "rotary": { name: "Rotary", type: Rotary, options: {}, oscTypes: [], icon: "🎛️" },
    "select": { name: "Dropdown", type: Dropdown, options: {}, oscTypes: [], icon: "🔽" },
    "pad": { name: "Pad", type: Pad, options: {}, oscTypes: ["ff", "fff"], icon: "🔲" }
};
