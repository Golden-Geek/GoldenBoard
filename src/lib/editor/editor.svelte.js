import Container from "./components/containers/Container.svelte";
import Button from "./components/parameters/Button.svelte";
import Slider from "./components/parameters/Slider.svelte";
import Toggle from "./components/parameters/Toggle.svelte";
import Rotary from "./components/parameters/Rotary.svelte";
import Dropdown from "./components/parameters/Dropdown.svelte";
import Pad from "./components/parameters/Pad.svelte";
import TextInput from "./components/parameters/TextInput.svelte";
import Stepper from "./components/parameters/Stepper.svelte";
import ColorPicker from "./components/parameters/ColorPicker.svelte";

import StringPropertyEditor from "./inspector/property/editors/StringPropertyEditor.svelte";
import SelectPropertyEditor from "./inspector/property/editors/SelectPropertyEditor.svelte";
import IntPropertyEditor from "./inspector/property/editors/IntPropertyEditor.svelte";
import SliderPropertyEditor from "./inspector/property/editors/SliderPropertyEditor.svelte";
import CssSizeEditor from "./inspector/property/editors/CSSSizeEditor.svelte";



export const editorState = $state({
    selectedComponents: [],
    editMode: true,
    inspectorOpen: true,
    leftPanelOpen: true,
    selectedBoard: null,
    selectedServer: null
});

export const dragDropState = $state({
    dragContainerSource: null,
    dragExpandedGaps: false
});

export const layoutTypes = {
    FREE: "free",
    HORIZONTAL: "horizontal",
    VERTICAL: "vertical",
    GRID: "grid"
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
    "text": { name: "Text", type: TextInput, options: {}, oscTypes: [], icon: "📝" },
    "slider": { name: "Slider", type: Slider, options: {}, oscTypes: ["f"], icon: "🎚️" },
    "stepper": { name: "Stepper", type: Stepper, options: {}, oscTypes: ["i"], icon: "➕" },
    "button": { name: "Button", type: Button, options: {}, oscTypes: ["N", "I"], icon: "🔘" },
    "toggle": { name: "Toggle", type: Toggle, options: {}, oscTypes: ["T", "F"], icon: "🔄" },
    "rotary": { name: "Rotary", type: Rotary, options: {}, oscTypes: [], icon: "🎛️" },
    "select": { name: "Dropdown", type: Dropdown, options: {}, oscTypes: [], icon: "🔽" },
    "pad": { name: "Pad", type: Pad, options: {}, oscTypes: ["ff", "fff"], icon: "🔲" },
    "color": { name: "Color", type: ColorPicker, options: {}, oscTypes: ["r"], icon: "🎨" },
};

export const getComponentTypeForNode = (node) => {
    switch (node.TYPE) {
        case "f": return "slider";
        case "i": return "stepper";
        case "N": case "I": return "button";
        case "T": case "F": return "toggle";
        case "ff": case "fff": return "pad";
        case "s": return "text";
        case "r": return "color";
        default:
            if (node.CONTENTS != null) return "container";
    }

    return "[notfound:" + node.TYPE + "]";
}

export const getIconForNode = (node) => {
    switch (node.TYPE) {
        case "I": case "N": return "⚡";
        case "i": return "🎚️";
        case "f": return "🎚️";
        case "s": return "🔤";
        case "T": case "F": return "☑️";
        case "r": return "🎨";
        case "ff": return "⌗";
        case "fff": return "🧊";
        default:
            if (node.CONTENTS != null) return "";
    }

    return "❓";
}