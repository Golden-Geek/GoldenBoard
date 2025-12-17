import { rootWidgetContainerData, type WidgetData } from "../widget/widget.svelte.ts";
import { mainData, saveData } from "../engine.svelte.ts";


const boards: BoardData[] = $derived(mainData.boardData.boards);

export type BoardData = {
    name: string;
    description?: string;
    icon?: string;
    rootWidget: WidgetData;
};


export const defaultBoard: BoardData = {
    name: "Board",
    description: "A default board with sample widgets",
    rootWidget: rootWidgetContainerData,
};

function getUniqueBoardName(baseName: string): string {
    let counter = 1;
    let name = baseName;
    const existingNames = new Set(boards.map(b => b.name));

    while (existingNames.has(name)) {
        name = `${baseName} ${counter}`;
        counter++;
    }
    return name;
}   


export function addBoard(): BoardData {
    const newBoard: BoardData = {
        name: getUniqueBoardName(defaultBoard.name),
        description: defaultBoard.description,
        icon: defaultBoard.icon,
        rootWidget: defaultBoard.rootWidget
    };
    boards.push(newBoard);
    saveData();
    return newBoard;
}

export function removeBoard(board: BoardData) {
    const index = boards.indexOf(board);
    if (index !== -1) {
        boards.splice(index, 1);
    }
    saveData();
}


export function loadBoards() {
    if (boards.length === 0) {
        addBoard();
    }
}