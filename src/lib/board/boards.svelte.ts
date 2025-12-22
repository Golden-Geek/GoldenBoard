import { Widget } from "../widget/widgets.svelte.ts";
import { mainState, saveData } from "../engine/engine.svelte.ts";
import { Property, PropertyType, type PropertyContainerDefinition, type PropertySingleDefinition } from "../property/property.svelte.ts";
import { type Color, ColorUtil } from "$lib/property/Color.svelte";
import { InspectableWithProps, sanitizeUserID } from "../property/inspectable.svelte.ts";


let boards = $derived(mainState.boards);

export class Board extends InspectableWithProps {

    rootWidget: Widget = Widget.createRootWidgetContainer();
    isSelected: boolean = $derived(mainState.selectedBoard === this);

    name = $derived(this.getSingleProp('name').get() as string);
    description = $derived(this.getSingleProp('description.text').get() as string);
    showDescription = $derived(this.getSingleProp('description.showDescription').get() as boolean);
    descriptionPlacement = $derived(this.getSingleProp('description.descriptionPlacement').get() as string);
    icon = $derived(this.getSingleProp('button.icon').get() as string);
    color = $derived(this.getSingleProp('button.color').get() as Color);

    constructor() {
        super("board");
        this.setupProps();
    }

    cleanup() {
        super.cleanup();
        this.rootWidget.cleanup();
    }


    getPropertyDefinitions(): { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition); } | null {
        return { ...super.getPropertyDefinitions(), ...boardPropertyDefinitions };
    }

    toSnapshot(includeID: boolean = true): any {
        let data = {
            ...super.toSnapshot(includeID),
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
    (newBoard.getProp('name') as Property | null)?.setRaw(name);

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
    name: { name: "Name", type: PropertyType.STRING, default: "Board" },
    button: {
        name: "Button", children: {
            icon: { name: "Icon", type: PropertyType.ICON, default: "" },
            color: { name: "Color", type: PropertyType.COLOR, default: ColorUtil.fromHex("#0b5b98ff"), canDisable: true },
        }
    },
    description: {
        name: "Description", color: "#459234", children: {
            text: { name: "Text", type: PropertyType.STRING, default: "", canDisable: true },
            showDescription: { name: "Show Description", type: PropertyType.BOOLEAN, default: true, canDisable: true },
            descriptionPlacement: { name: "Description Placement", type: PropertyType.ENUM, canDisable: true, default: "button", options: { "button": "Button", "bar": "Bar", "tooltip": "Tooltip" } },
        }
    }
};