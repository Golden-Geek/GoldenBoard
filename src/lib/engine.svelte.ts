import { registerAllWidgets, type BoardData } from "./board/boards.svelte.ts";
import type { OSCQueryClient } from "./oscquery/oscquery.svelte.ts";
import { getServerConfigs, servers, syncServerFromConfigs, type ServerConfig } from "./oscquery/servers.svelte.ts";
import { widgetContextMenuItems, type WidgetContainerData, type WidgetData } from "./widget/widgets.svelte.ts";

//-----------------------------
// Editor
//-----------------------------


export type EditorData = {
    editMode: EditMode,
    layout: {} | null,
    selectedWidgetIDs: string[];
};

export enum EditMode {
    Edit = "edit",
    Live = "live"
};

export const defaultEditorData: EditorData = {
    editMode: EditMode.Edit,
    layout: null,
    selectedWidgetIDs: []
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
    action?: () => void;
    disabled?: boolean;
    checked?: boolean;
    submenu?: ContextMenuItem[];
};

//using null as separators
export const contextMenus : Record<MenuContextType, ContextMenuItem[]> = $state({
    [MenuContextType.Widget]: widgetContextMenuItems,
    [MenuContextType.Board]: [],
    [MenuContextType.Server]: []
});

export const menuContext = $state({
    type: MenuContextType.Widget,
    target: null as any | null,
    position: { x: 0, y: 0 }
});


// -----------------------------
// Main Data
// -----------------------------

type MainDataSnapshot = {
    editor: EditorData;
    serverData: {
        selectedServer: string | null;
        serverConfigs: ServerConfig[];
    };
    boardData: {
        selectedBoardID: string | null;
        boards: BoardData[];
    };
};

export const mainData: MainDataSnapshot = $state(
    {
        editor: defaultEditorData as EditorData,
        serverData:
        {
            selectedServer: null as string | null,
            serverConfigs: [] as ServerConfig[]
        },
        boardData:
        {
            selectedBoardID: null as string | null,
            boards: [] as BoardData[]
        }
    }
);

const defaultMainData = $state.snapshot(mainData);

// -----------------------------
// Selection
// -----------------------------

export function clearSelection() {
    mainData.editor.selectedWidgetIDs = [];
}

export function selectOnlyWidget(widgetID: string) {
    mainData.editor.selectedWidgetIDs = [widgetID];
}

export function addWidgetToSelection(widgetID: string) {
    if (!mainData.editor.selectedWidgetIDs.includes(widgetID)) {
        mainData.editor.selectedWidgetIDs.push(widgetID);
    }
}

export function removeWidgetFromSelection(widgetID: string) {
    const index = mainData.editor.selectedWidgetIDs.indexOf(widgetID);
    if (index !== -1) {
        mainData.editor.selectedWidgetIDs.splice(index, 1);
    }
}

export function toggleWidgetSelection(widgetID: string) {
    const index = mainData.editor.selectedWidgetIDs.indexOf(widgetID);
    if (index === -1) {
        mainData.editor.selectedWidgetIDs.push(widgetID);
    } else {
        mainData.editor.selectedWidgetIDs.splice(index, 1);
    }
}

export function isWidgetSelected(widgetID: string): boolean {
    return mainData.editor.selectedWidgetIDs.includes(widgetID);
}

// -----------------------------
// Inspectable Map  
// -----------------------------


export const widgetsMap: Map<string, any> = $state(new Map());

export function registerWidget(id: string, obj: any) {
    widgetsMap.set(id, obj);
}

export function unregisterWidget(id: string) {
    widgetsMap.delete(id);
}

export function getWidgetByID<T>(id: string): T | null {
    return widgetsMap.get(id) as T || null;
}

export function getBoardByID(id: string): BoardData | null {
    const board = mainData.boardData.boards.find(b => b.id === id);
    return board || null;
}

export function getServerByID(id: string): OSCQueryClient | null {
    const server = servers.find(s => s.id === id);
    return server || null;
}

// -----------------------------
// Undo/Redo (snapshot-based)
// -----------------------------

export const history = $state({
    past: [] as { label: string | null, data: MainDataSnapshot }[],
    present: null as { label: string | null, data: MainDataSnapshot } | null,
    future: [] as { label: string | null, data: MainDataSnapshot }[]
});

const canUndo = $derived(history.past.length > 0);
const canRedo = $derived(history.future.length > 0);

let isApplyingHistory = false;

const historyMax = $state(100);

function snapshotMain(): MainDataSnapshot {
    return $state.snapshot(mainData) as MainDataSnapshot;
}

function persistSnapshotOnly() {
    localStorage.setItem('data', JSON.stringify(mainData));
}

function applySnapshot(snap: MainDataSnapshot) {
    // Assign per-field to keep the top-level reactive object stable.
    mainData.editor = snap.editor;
    mainData.serverData.selectedServer = snap.serverData.selectedServer;
    mainData.serverData.serverConfigs = snap.serverData.serverConfigs;
    mainData.boardData.selectedBoardID = snap.boardData.selectedBoardID;
    mainData.boardData.boards = snap.boardData.boards;
}

function commitUndoPoint(label: string | null = null) {
    if (isApplyingHistory) return;
    if (!history.present) return;

    //clone present to past
    const presentClone = $state.snapshot(history.present);
    history.past.push(presentClone);
    if (history.past.length > historyMax) {
        history.past.shift();
    }
    history.present = { label, data: snapshotMain() };
    history.future = [];
}

export function undo(count: number = 1): boolean {
    if (history.past.length === 0) return false;

    isApplyingHistory = true;
    try {
        const current = history.present;
        history.future.unshift(current!);
        const prev = history.past.pop()!;
        history.present = $state.snapshot(prev);
        console.log("Undo to:", prev.label, prev.data.boardData.boards.length, "boards");
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

        applySnapshot(next.data);
        persistSnapshotOnly();
    } finally {
        isApplyingHistory = false;
    }

    if (count > 1)
        redo(count - 1);

    return true;
}



export function saveData(label: string | null = null, options?: { skipHistory?: boolean }) {
    if (!isApplyingHistory) {
        mainData.serverData.serverConfigs = getServerConfigs();
    }
    persistSnapshotOnly();
    if (!options?.skipHistory) {
        commitUndoPoint(label);
    }
}

export function clearData() {
    localStorage.removeItem('data');
    applySnapshot($state.snapshot(defaultMainData));
    commitUndoPoint("Clear Data");

    syncServerFromConfigs();
}

export function loadData() {
    widgetsMap.clear();

    const stateStr = localStorage.getItem('data');
    if (stateStr) {
        const stateObj = JSON.parse(stateStr);

        mainData.editor = stateObj.editor;
        mainData.boardData = stateObj.boardData;
        mainData.serverData = stateObj.serverData;
    }

    //Reset history
    history.past = [];
    history.future = [];
    history.present = { label: "Initial Load", data: snapshotMain() };

    syncServerFromConfigs();

    registerAllWidgets();
}




loadData(); //only called here