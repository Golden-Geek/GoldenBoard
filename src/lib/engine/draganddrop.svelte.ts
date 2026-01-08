export type DndData = {
    type: string;
    htmlElement: any;
    data: any;
}

export type DndDropCandidate = {
    type: string;
    target: any;
    position?: 'before' | 'after';
};

export const dndState = $state({
    draggingElements: [] as DndData[],
    dropCandidate: null as DndDropCandidate | null,
    dragOffset: { x: 0, y: 0 }
});


export function startDrag(elements: any[]) {

    // give the browser required drag data (some browsers need this)
    // e.dataTransfer?.setData('text/plain', 'tree-item');
    // e.dataTransfer!.effectAllowed = 'move';

    // use the current element as the drag image to avoid layout shifts
    // const el = e.currentTarget as HTMLElement;
    // try {
    //     e.dataTransfer?.setDragImage(el, 0, 0);
    // } catch { }

    // Defer the state update so Svelte won't re-render the dragged element
    // during the browser's native dragstart (which can cause immediate dragend).
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