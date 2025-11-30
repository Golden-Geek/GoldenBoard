import { writable } from 'svelte/store';
import type { Widget, WidgetKind } from '$lib/types/widgets';

export type WidgetMoveDrag = {
	kind: 'widget-move';
	widgetId: string;
	sourceContainerId?: string;
	originLayout?: string;
};

export type WidgetTemplateDrag = {
	kind: 'widget-template';
	source: 'builtin' | 'custom';
	widgetKind?: WidgetKind;
	template?: Widget;
	templateId?: string;
	label?: string;
};

export type OscNodeDrag = {
	kind: 'osc-node';
	path: string;
	osctype?: string;
	meta?: Record<string, unknown>;
};

export type CustomDrag = {
	kind: 'custom';
	identifier: string;
	data: Record<string, unknown>;
};

export type DragIntent = WidgetMoveDrag | WidgetTemplateDrag | OscNodeDrag | CustomDrag;

export type DragOrigin = 'canvas' | 'toolbar' | 'osc' | 'external' | 'unknown';

export type ActiveDragOperation = {
	intent: DragIntent;
	origin: DragOrigin;
};

export const draggingWidgetId = writable<string | null>(null);
export const activeDragOperation = writable<ActiveDragOperation | null>(null);
