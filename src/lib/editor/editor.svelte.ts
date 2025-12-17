
export type EditorData = {
    editMode: EditMode,
    layout: {} | null
};

export enum EditMode {
    Edit = "edit",
    Live = "live"
};


export const defaultEditorData: EditorData = {
    editMode: EditMode.Edit,
    layout: null
};
