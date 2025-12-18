import { type BoardData } from "./board/boards.svelte.ts";
import { defaultEditorData, type EditorData } from "./editor/editor.svelte";
import { getServerConfigs, type ServerConfig } from "./oscquery/servers.svelte.ts";


type MainDataSnapshot = {
    editor: EditorData;
    serverData: {
        selectedServer: string | null;
        serverConfigs: ServerConfig[];
    };
    boardData: {
        selectedBoard: string | null;
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
            selectedBoard: null as string | null,
            boards: [] as BoardData[]
        }
    }
);

const defaultMainData = $state.snapshot(mainData);


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
    mainData.boardData.selectedBoard = snap.boardData.selectedBoard;
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
    mainData.editor = defaultMainData.editor;
    mainData.boardData = defaultMainData.boardData;
    mainData.serverData = defaultMainData.serverData;
    commitUndoPoint("Clear Data");
}

export function loadData() {
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
}

loadData(); //only called here