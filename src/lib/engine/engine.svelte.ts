import { Menu } from "$lib/inspector/inspector.svelte";
import { Board, applyBoardsSnapshot, toBoardsSnaphot, getBoardByID } from "../board/boards.svelte.ts";
import { applyServersSnapshot, getServerByID, toServersSnapshot, type OSCQueryClient } from "../servers/oscquery.svelte.ts";
import { getWidgetContextMenuItems, widgetsMap } from "../widget/widgets.svelte.ts";
import { GlobalSettings, toGlobalSettingsSnapshot, applyGlobalSettingsSnapshot } from "./globalsettings.svelte.ts";
//-----------------------------
// Editor
//-----------------------------


export type EditorData = {
    editMode: EditMode,
    fullScreen: boolean,
    inspectorMenu: Menu,
    layout: {} | null
};

export enum EditMode {
    Edit = "edit",
    Live = "live"
};

export const defaultEditorData: EditorData = {
    editMode: EditMode.Edit,
    inspectorMenu: Menu.Widget,
    fullScreen: false,
    layout: null
};

// -----------------------------
// Context Menu
// -----------------------------

export enum MenuContextType {
    Widget = "widget",
    Board = "board",
    Server = "server"
}

export type ContextMenuItem = {
    separator?: boolean;
    label?: string;
    icon?: string;
    action?: (source: any) => void;
    visible?: boolean;
    disabled?: boolean;
    checked?: boolean;
    submenu?: (source: any) => ContextMenuItem[];
};

//using null as separators
export const contextMenus: Record<MenuContextType, ((source: any) => ContextMenuItem[]) | undefined> = $state({
    [MenuContextType.Widget]: getWidgetContextMenuItems,
    [MenuContextType.Board]: undefined,
    [MenuContextType.Server]: undefined
});

export const menuContext = $state({
    type: MenuContextType.Widget,
    target: null as any | null,
    position: { x: 0, y: 0 }
});


// -----------------------------
// Main Data
// -----------------------------

export const mainState = $state(
    {
        editor: defaultEditorData as EditorData,
        loadingData: false,
        servers: [] as OSCQueryClient[],
        boards: [] as Board[],
        globalSettings: new GlobalSettings(),
        selectedBoard: null as Board | null,
        selectedServer: null as OSCQueryClient | null
    }
);

const defaultMainData = {
    editor: defaultEditorData as EditorData,
    loadingData: false,
    servers: [],
    boards: [],
    globalSettings: null,
    selectedBoard: null,
    selectedServer: null
}


// -----------------------------
// Undo/Redo (snapshot-based)
// -----------------------------

export const history = $state({
    past: [] as { label: string | null, id?: string | undefined, data: {} }[],
    present: null as { label: string | null, id?: string | undefined, data: {} } | null,
    future: [] as { label: string | null, id?: string | undefined, data: {} }[]
});

const canUndo = $derived(history.past.length > 0);
const canRedo = $derived(history.future.length > 0);

let isApplyingHistory = false;

const historyMax = $state(100);

function savePersistentHistory() {
    localStorage.setItem('history', JSON.stringify({
        past: history.past,
        present: history.present,
        future: history.future
    }));
}

function snapshotMain() {

    return {
        editor: $state.snapshot(mainState.editor),
        servers: toServersSnapshot(),
        boards: toBoardsSnaphot(),
        globalSettings: toGlobalSettingsSnapshot(),
        selectedServerID: mainState.selectedServer ? mainState.selectedServer.id : null,
        selectedBoardID: mainState.selectedBoard ? mainState.selectedBoard.id : null
    }
}

function persistSnapshotOnly() {
    localStorage.setItem('data', JSON.stringify(snapshotMain()));
}

function applySnapshot(snap: any) {
    // Assign per-field to keep the top-level reactive object stable.
    mainState.loadingData = true;
    applyServersSnapshot(snap.servers);
    applyBoardsSnapshot(snap.boards);
    applyGlobalSettingsSnapshot(snap.globalSettings);
    mainState.loadingData = false;
    mainState.selectedServer = getServerByID(snap.selectedServerID);
    mainState.selectedBoard = getBoardByID(snap.selectedBoardID);
    mainState.editor = snap.editor ?? $state.snapshot(defaultMainData.editor);
}

function commitUndoPoint(label: string | null = null, coalesceID?: string) {
    if (isApplyingHistory) return;
    if (!history.present) return;

    //clone present to past
    const presentClone = $state.snapshot(history.present);
    if (!coalesceID || (coalesceID && history.present.id !== coalesceID)) {
        history.past.push(presentClone);

        if (history.past.length > historyMax) {
            history.past.shift();
        }
    }


    history.present = { label, id: coalesceID, data: snapshotMain() };
    history.future = [];

    savePersistentHistory();
}

export function undo(count: number = 1): boolean {
    if (history.past.length === 0) return false;

    isApplyingHistory = true;
    try {
        const current = history.present;
        history.future.unshift(current!);
        const prev = history.past.pop()!;
        history.present = $state.snapshot(prev);
        savePersistentHistory();
        applySnapshot(prev.data);
        persistSnapshotOnly();
    } finally {
        isApplyingHistory = false;
    }

    if (count > 1)
        undo(count - 1);

    return true;
}

export function redo(count: number = 1): boolean {
    if (history.future.length === 0) return false;

    isApplyingHistory = true;
    try {
        const current = history.present;
        const next = history.future.shift()!;
        history.past.push(current!);
        history.present = $state.snapshot(next);
        savePersistentHistory();

        applySnapshot(next.data);
        persistSnapshotOnly();
    } finally {
        isApplyingHistory = false;
    }

    if (count > 1)
        redo(count - 1);

    return true;
}

export function saveData(label: string | null = null, options?: { skipHistory?: boolean, coalesceID?: string }) {
    persistSnapshotOnly();
    if (!options?.skipHistory) {
        commitUndoPoint(label, options?.coalesceID);
    }
}

export function clearData() {
    localStorage.removeItem('data');
    applySnapshot($state.snapshot(defaultMainData));
    mainState.selectedBoard = mainState.boards.length > 0 ? mainState.boards[0] : null;
    mainState.selectedServer = mainState.servers.length > 0 ? mainState.servers[0] : null;
    commitUndoPoint("Clear Data");
}

export function loadData() {
    while (widgetsMap && Object.keys(widgetsMap).length > 0) {

        const widget = Object.values(widgetsMap)[0];
        widget.remove();
    }

    const stateStr = localStorage.getItem('data');
    if (stateStr) {
        const snap = JSON.parse(stateStr);
        applySnapshot(snap);
    } else {
        applySnapshot($state.snapshot(defaultMainData));
    }

    if(!mainState.selectedBoard)
    {
        mainState.selectedBoard = mainState.boards.length > 0 ? mainState.boards[0] : null;
    }
    if (mainState.globalSettings.modeOnLoad != 'last') mainState.editor.editMode = mainState.globalSettings.modeOnLoad as EditMode;

    let persistedHistoryStr = localStorage.getItem('history');
    if (persistedHistoryStr) {
        const persistedHistory = JSON.parse(persistedHistoryStr);
        history.past = persistedHistory.past || [];
        history.present = persistedHistory.present || { label: "Initial Load", data: snapshotMain() };
        history.future = persistedHistory.future || [];
    } else {
        history.past = [];
        history.future = [];
        history.present = { label: "Initial Load", data: snapshotMain() };
    }
}

export function getAllWidgets() {
    return Object.values(widgetsMap);
}



loadData(); //only called here