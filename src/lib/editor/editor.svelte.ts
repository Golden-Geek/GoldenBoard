import { OSCQueryClient } from "$lib/oscquery/oscquery.svelte";
import { writable } from "svelte/store";

export enum EditMode {
    Edit = "edit",
    Live = "live"
};

export const editorState = $state(
    {
        editMode: EditMode.Edit,
        selectedServerName: "",
        layout: null as {} | null
    }
);


export function saveEditorState() {
    localStorage.setItem('editorState', JSON.stringify(editorState));
}

export function loadEditorState() {
    const stateStr = localStorage.getItem('editorState');
    if (stateStr) {
        const stateObj = JSON.parse(stateStr);

        if (editorState.editMode !== stateObj.editMode) {
            console.log("Restoring editor mode:", stateObj.editMode);
            editorState.editMode = stateObj.editMode;
        }

        if (editorState.selectedServerName !== stateObj.selectedServer?.name) {
            editorState.selectedServerName = stateObj.selectedServer?.name;
        }

        if (JSON.stringify(editorState.layout) !== JSON.stringify(stateObj.layout)) {
            editorState.layout = stateObj.layout;
        }
    }
}


// node icons

const nodeTypes = [
    { type: "Container", icon: "📁" },
    { type: "Boolean", icon: "☑️" },
    { type: "Integer", icon: "🔢" },
    { type: "Float", icon: "🔣" },
    { type: "String", icon: "🔤" },
    { type: "Color", icon: "🎨" },
    { type: "Trigger", icon: "⚡" },
    { type: "Enum", icon: "🎛️" },
    { type: "Point2D", icon: "📐" },
    { type: "Point3D", icon: "🧊" },
]

export function getNodeIcon(type: string): string {
    const nodeType = nodeTypes.find(t => t.type === type);
    return nodeType ? nodeType.icon : "❓";
}