import { Widget } from "../widget/widgets.svelte.ts";
import { mainState, saveData } from "../engine.svelte.ts";
import { getPropsFromDefinitions, InspectableWithProps, PropertyType, type PropertyContainerDefinition, type PropertySingleDefinition } from "../property/property.svelte.ts";


let boards = $derived(mainState.boards);

export class Board extends InspectableWithProps {

    name: string = $state('');
    icon: string = $state('');
    rootWidget: Widget = Widget.createRootWidgetContainer();
    isSelected: boolean = $derived(mainState.selectedBoard === this);

    constructor() {
        super("board");
        this.props = getPropsFromDefinitions(boardPropertyDefinitions);
    }

    cleanup() {
        this.rootWidget.cleanup();
    }

    toSnapshot(includeID: boolean = true): any {
        let data = {
            ...super.toSnapshot(includeID),
            name: this.name,
            icon: this.icon,
            rootWidget: this.rootWidget.toSnapshot(includeID)
        };

        if (includeID) {
            data.id = this.id;
        }

        return data;
    }

    applySnapshot(data: any) {
        super.applySnapshot(data);
        this.name = data.name;
        this.icon = data.icon;
        this.rootWidget.applySnapshot(data.rootWidget);
    }
}

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


export function addBoard(): Board {
    let name = getUniqueBoardName("Board");

    const newBoard = new Board();
    newBoard.name = name;

    boards.push(newBoard);
    saveData("Add Board " + newBoard.name);//+ " (" + boards.length + ")");
    mainState.selectedBoard = newBoard;
    return newBoard;
};


export function removeBoard(board: Board) {
    const index = boards.indexOf(board);
    if (index == -1) {
        throw (new Error("Board not found"));
    }

    board.cleanup();
    boards.splice(index, 1);
    saveData("Remove Board " + board.name);// + " (" + boards.length + ")");
}

export function getBoardByID(id: string): Board | null {
    return boards.find((b: Board) => b.id === id) || null;
}

export function toBoardsSnaphot(): any[] {
    return boards.map(b => b.toSnapshot());
}

export function applyBoardsSnapshot(data: any) {

    if (data == null || data.length === 0) {
        while (boards.length > 0) {
            removeBoard(boards[0]);
        }

        addBoard();
        return;
    }

    //list removed boards and cleanup
    const removedBoards = boards.filter(b => !data.find((bData: any) => bData.id === b.id));
    for (let rb of removedBoards) {
        removeBoard(rb);
    }

    //match id and update existing boards
    mainState.boards = data.map((bData: any) => {
        let board = boards.find(b => b.id === bData.id);
        if (!board) {
            board = new Board();
        }

        board.applySnapshot(bData);
        return board;
    });
}

const boardPropertyDefinitions: { [key: string]: PropertySingleDefinition | PropertyContainerDefinition } = {
    name: { name: "Name", type: PropertyType.STRING, label: "Name", default: "Board" } as PropertySingleDefinition,
    icon: { name: "Icon", type: PropertyType.ICON, label: "Icon", default: "📋" } as PropertySingleDefinition,
    description: { name: "Description", type: PropertyType.TEXT, label: "Description", default: "" } as PropertySingleDefinition
};