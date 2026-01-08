import { createWidgetFromOSCNode, moveWidget, Widget } from "$lib/widget/widgets.svelte";

export type DndData = {
    type: string;
    htmlElement: any;
    data: any;
}

export type DndDropCandidate = {
    type: string;
    target: any;
    position?: 'before' | 'after';
    insertInto?: boolean;
};

export const dndState = $state({
    draggingElements: [] as DndData[],
    dropCandidate: null as DndDropCandidate | null,
    dragOffset: { x: 0, y: 0 }
});


export function startDrag(elements: any[]) {
    setTimeout(() => {
        dndState.draggingElements = elements;
    }, 0);
}

export function updateDragOffset(x: number, y: number) {
    dndState.dragOffset = { x, y };
}

export function stopDrag() {
    dndState.draggingElements = [];
    dndState.dropCandidate = null;
}


export function handleWidgetDrop() {

    const candidate = dndState.dropCandidate;
    const dragged = dndState.draggingElements[0];

    stopDrag();

    if (dragged == null) return;

    if (!candidate || candidate.type !== 'widget') return;

    const target = candidate.target as Widget;
    const position = candidate.position ?? 'after';
    const insertInto = candidate.insertInto ?? false;

    if (dragged.type == 'widget') {
        moveWidget(dragged.data as Widget, target, position, { insertInto, save: true });
        return;
    }

    if (dragged.type == 'osc-node') {
        const newWidget = createWidgetFromOSCNode(dragged.data);
        if (newWidget) {
            const targetParent = insertInto ? target : target.parent;
            if (targetParent) {
                let options = { save: true, select: true, before: undefined as Widget | undefined, after: undefined as Widget | undefined };
                if (position === 'after') {
                    options.after = target;
                } else if (position === 'before') {
                    options.before = target;
                }

                targetParent.addWidget(newWidget, options);
            }
        }
    }
}