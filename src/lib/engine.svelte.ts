import { addBoard, defaultBoard, loadBoards, type BoardData } from "./board/boards.svelte.ts";
import { defaultEditorData, type EditorData } from "./editor/editor.svelte";
import { getServerConfigs, loadServerConfigs, type ServerConfig } from "./oscquery/servers.svelte.ts";


export const mainData = $state(
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
            boards: [defaultBoard] as BoardData[]
        }
    }
);

const defaultMainData = $state.snapshot(mainData);



export function saveData() {
    mainData.serverData.serverConfigs = getServerConfigs();
    localStorage.setItem('data', JSON.stringify(mainData));
}

export function clearData() {
    localStorage.removeItem('data');
    mainData.editor = defaultMainData.editor;
    mainData.boardData = defaultMainData.boardData;
    mainData.serverData = defaultMainData.serverData;
}

export function loadData() {
    const stateStr = localStorage.getItem('data');
    if (stateStr) {
        const stateObj = JSON.parse(stateStr);

        mainData.editor = stateObj.editor;
        mainData.boardData = stateObj.boardData;
        mainData.serverData = stateObj.serverData;
    }

    loadServerConfigs();
    loadBoards();

}
