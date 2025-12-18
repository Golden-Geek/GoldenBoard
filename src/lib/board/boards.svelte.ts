import { rootWidgetContainerData, type WidgetContainerData, type WidgetData } from "../widget/widgets.svelte.ts";
import { mainData, registerWidget, saveData, unregisterWidget } from "../engine.svelte.ts";


const boards: BoardData[] = $derived(mainData.boardData.boards);

export type BoardData = {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    rootWidget: WidgetData;
};


export const defaultBoard: BoardData = {
    id: "board-" + crypto.randomUUID(),
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
    let name = getUniqueBoardName("Board");
    const newBoard: BoardData = {
        name: name,
        id: "board-" + crypto.randomUUID(),
        description: defaultBoard.description,
        icon: defaultBoard.icon,
        rootWidget: defaultBoard.rootWidget
    };

    boards.push(newBoard);
    registerAllWidgets(newBoard);
    saveData("Add Board " + newBoard.name);//+ " (" + boards.length + ")");
    return newBoard;
}

export function removeBoard(board: BoardData) {
    const index = boards.indexOf(board);
    if (index !== -1) {
        boards.splice(index, 1);
    }
    saveData("Remove Board " + board.name);// + " (" + boards.length + ")");
}

export function loadBoards() {
    if (boards.length === 0) {
        addBoard();
    }
}

function registerWidgetContainer(widget: WidgetData | WidgetContainerData) {
    registerWidget(widget.id, widget);
    if ('children' in widget) {
        for (const child of widget.children) {
            registerWidgetContainer(child);
        }
    }
}

export function registerAllWidgets(board: BoardData | null = null) {
    if (!board) {
        for (const b of boards) {
            registerWidgetContainer(b.rootWidget);
        }
    } else {
        registerWidgetContainer(board.rootWidget);
    }
}

function unRegisterWidgetRecursive(widget: WidgetData | WidgetContainerData) {
    unregisterWidget(widget.id);
    if ('children' in widget) {
        for (const child of widget.children) {
            unRegisterWidgetRecursive(child);
        }
    }
}

export function unRegisterAllWidgetForBoard(board: BoardData) {
    unRegisterWidgetRecursive(board.rootWidget);
}