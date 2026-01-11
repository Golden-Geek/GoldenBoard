import { saveData } from "$lib/engine/engine.svelte";
import { createWidgetFromOSCNode, moveWidget, Widget } from "$lib/widget/widgets.svelte";

export type DndData = {
    type: string;
    htmlElement: any;
    data: any;
    pointerOffset?: { x: number; y: number };
}

export type DndDropCandidate = {
    type: string;
    target: any;
    position?: 'before' | 'after';
    insertInto?: boolean;
    freeLayout?: {
        left: number;
        top: number;
        containerSize: { width: number; height: number };
        widgetSize?: { width: number; height: number };
    };
};

export const dndState = $state({
    draggingElements: [] as DndData[],
    dropCandidate: null as DndDropCandidate | null,
    dragOffset: { x: 0, y: 0 }
});


export function startDrag(elements: DndData[]) {
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

    const parseCssValue = (value: unknown): { value: number; unit: string } => {
        if (typeof value === 'number' && Number.isFinite(value)) return { value, unit: 'px' };
        const str = String(value ?? '').trim();
        const match = str.match(/^(-?[\d.]+)([a-z%]*)$/i);
        if (!match) return { value: 0, unit: 'px' };
        return { value: parseFloat(match[1]), unit: match[2] || 'px' };
    };

    const toUnitValue = (unit: string, valuePx: number, containerSize: number): string | number => {
        const safe = containerSize === 0 ? 1 : containerSize;
        const round = (v: number) => Math.round(v * 100) / 100;
        if (unit === '%') return `${round((valuePx / safe) * 100)}%`;
        if (unit === '' || unit === 'px') return round(valuePx);
        return `${round(valuePx)}${unit}`;
    };

    const getWidgetSizePx = (
        widget: Widget,
        containerSize: { width: number; height: number },
        fallback?: { width: number; height: number }
    ): { width: number; height: number } => {
        const widthProp: any = widget.getSingleProp('position.width');
        const heightProp: any = widget.getSingleProp('position.height');

        const widthRaw = widthProp?.getRaw?.();
        const heightRaw = heightProp?.getRaw?.();

        const w = parseCssValue(widthRaw);
        const h = parseCssValue(heightRaw);

        const widthPx =
            w.unit === '%' ? (w.value / 100) * containerSize.width : Number.isFinite(w.value) ? w.value : 0;
        const heightPx =
            h.unit === '%' ? (h.value / 100) * containerSize.height : Number.isFinite(h.value) ? h.value : 0;

        return {
            width: Math.max(0, widthPx || fallback?.width || 0),
            height: Math.max(0, heightPx || fallback?.height || 0)
        };
    };

    const applyFreeLayoutPosition = (
        widget: Widget,
        free: NonNullable<DndDropCandidate['freeLayout']>
    ) => {
        const { containerSize } = free;
        const widgetSize = getWidgetSizePx(widget, containerSize, free.widgetSize);
        const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

        const desiredLeft = clamp(free.left, 0, Math.max(0, containerSize.width - widgetSize.width));
        const desiredTop = clamp(free.top, 0, Math.max(0, containerSize.height - widgetSize.height));

        const leftProp: any = widget.getSingleProp('position.left');
        const rightProp: any = widget.getSingleProp('position.right');
        const topProp: any = widget.getSingleProp('position.top');
        const bottomProp: any = widget.getSingleProp('position.bottom');

        const leftSnap = leftProp ? { unit: parseCssValue(leftProp.getRaw()).unit, canDisable: !!leftProp.definition?.canDisable, enabled: leftProp.enabled ?? !leftProp.definition?.canDisable } : null;
        const rightSnap = rightProp ? { unit: parseCssValue(rightProp.getRaw()).unit, canDisable: !!rightProp.definition?.canDisable, enabled: rightProp.enabled ?? !rightProp.definition?.canDisable } : null;
        const topSnap = topProp ? { unit: parseCssValue(topProp.getRaw()).unit, canDisable: !!topProp.definition?.canDisable, enabled: topProp.enabled ?? !topProp.definition?.canDisable } : null;
        const bottomSnap = bottomProp ? { unit: parseCssValue(bottomProp.getRaw()).unit, canDisable: !!bottomProp.definition?.canDisable, enabled: bottomProp.enabled ?? !bottomProp.definition?.canDisable } : null;

        const rightPx = containerSize.width - desiredLeft - widgetSize.width;
        const bottomPx = containerSize.height - desiredTop - widgetSize.height;

        // X axis: prefer whichever anchor is already enabled. If neither is enabled, enable left.
        if (leftSnap && leftSnap.enabled) {
            leftProp.set(toUnitValue(leftSnap.unit, desiredLeft, containerSize.width) as any);
        } else if (rightSnap && rightSnap.enabled) {
            rightProp.set(toUnitValue(rightSnap.unit, rightPx, containerSize.width) as any);
        } else if (leftProp && leftSnap?.canDisable) {
            leftProp.enabled = true;
            leftProp.set(toUnitValue(leftSnap.unit, desiredLeft, containerSize.width) as any);
        }

        // Y axis: prefer whichever anchor is already enabled. If neither is enabled, enable top.
        if (topSnap && topSnap.enabled) {
            topProp.set(toUnitValue(topSnap.unit, desiredTop, containerSize.height) as any);
        } else if (bottomSnap && bottomSnap.enabled) {
            bottomProp.set(toUnitValue(bottomSnap.unit, bottomPx, containerSize.height) as any);
        } else if (topProp && topSnap?.canDisable) {
            topProp.enabled = true;
            topProp.set(toUnitValue(topSnap.unit, desiredTop, containerSize.height) as any);
        }
    };

    const candidate = dndState.dropCandidate;
    const dragged = dndState.draggingElements[0];

    stopDrag();

    if (dragged == null) return;

    if (!candidate || candidate.type !== 'widget') return;

    const target = candidate.target as Widget;
    const position = candidate.position ?? 'after';
    const insertInto = candidate.insertInto ?? false;

    const shouldApplyFreeLayout =
        insertInto === true &&
        !!candidate.freeLayout &&
        (target.getSingleProp('layout')?.get() as any) === 'free';

    if (dragged.type == 'widget') {
        moveWidget(dragged.data as Widget, target, position, { insertInto, save: true });

        if (shouldApplyFreeLayout) {
            const moved = dragged.data as Widget;
            applyFreeLayoutPosition(moved, candidate.freeLayout!);
            saveData('Place Widget', { coalesceID: 'place-widget' });
        }
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

                if (shouldApplyFreeLayout && targetParent === target) {
                    applyFreeLayoutPosition(newWidget, candidate.freeLayout!);
                    saveData('Place Widget', { coalesceID: 'place-widget' });
                }
            }
        }
    }
}