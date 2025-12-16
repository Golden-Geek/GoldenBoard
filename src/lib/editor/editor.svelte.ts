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
        layout : null as {} | null
    }
);


export function saveEditorState() {
    localStorage.setItem('editorState', JSON.stringify(editorState));
}

export function loadEditorState() {
    const stateStr = localStorage.getItem('editorState');
    if (stateStr) {
        const stateObj = JSON.parse(stateStr);
        
        if(editorState.editMode !== stateObj.editMode) {
            console.log("Restoring editor mode:", stateObj.editMode);
            editorState.editMode = stateObj.editMode;
        }

        if(editorState.selectedServerName !== stateObj.selectedServer?.name) {
            editorState.selectedServerName = stateObj.selectedServer?.name;
        }

        if(JSON.stringify(editorState.layout) !== JSON.stringify(stateObj.layout)) {
            editorState.layout = stateObj.layout;
        }
    }  
}
