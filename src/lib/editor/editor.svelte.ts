import { writable } from "svelte/store";

export enum EditMode {
    Edit = "edit",
    Live = "live"
};

export const editMode = writable<EditMode.Edit | EditMode.Live>(EditMode.Edit);