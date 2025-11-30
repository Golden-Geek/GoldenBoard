import { draggable, dropTargetForElements, type ElementEventPayloadMap, type ElementDropTargetEventPayloadMap, type ElementGetFeedbackArgs, type ElementDropTargetGetFeedbackArgs } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { Action } from 'svelte/action';
import type { DragIntent } from '$lib/stores/drag';

const noop = () => {};

type ElementEvents = Partial<{ [Key in keyof ElementEventPayloadMap]: (payload: ElementEventPayloadMap[Key]) => void }>;
type DropTargetEvents = Partial<{ [Key in keyof ElementDropTargetEventPayloadMap]: (payload: ElementDropTargetEventPayloadMap[Key]) => void }>;

type ExtraDragData = Record<string | symbol, unknown>;

type DragHandle = Element | null | undefined | (() => Element | null | undefined);

type DropEffect = Exclude<DataTransfer['dropEffect'], 'none'>;

export type DragData = ExtraDragData & {
	intent?: DragIntent;
};

export interface PragmaticDraggableConfig {
	enabled?: boolean;
	handle?: DragHandle;
	canDrag?: (args: ElementGetFeedbackArgs) => boolean;
	getInitialData?: () => DragData;
	getInitialDataForExternal?: (args: ElementGetFeedbackArgs) => Record<string, string | undefined>;
	events?: ElementEvents;
}

export interface PragmaticDropTargetConfig {
	enabled?: boolean;
	getData?: (args: ElementDropTargetGetFeedbackArgs) => ExtraDragData;
	canDrop?: (args: ElementDropTargetGetFeedbackArgs) => boolean;
	getDropEffect?: (args: ElementDropTargetGetFeedbackArgs) => DropEffect;
	getIsSticky?: (args: ElementDropTargetGetFeedbackArgs) => boolean;
	events?: DropTargetEvents;
}

export const pragmaticDraggable: Action<HTMLElement, PragmaticDraggableConfig | undefined> = (node, config) => {
	let cleanup = attachDraggable(node, config);

	return {
		update(next) {
			cleanup();
			cleanup = attachDraggable(node, next);
		},
		destroy() {
			cleanup();
		}
	};
};

export const pragmaticDropTarget: Action<HTMLElement, PragmaticDropTargetConfig | undefined> = (node, config) => {
	let cleanup = attachDropTarget(node, config);

	return {
		update(next) {
			cleanup();
			cleanup = attachDropTarget(node, next);
		},
		destroy() {
			cleanup();
		}
	};
};

export const createDragData = (intent: DragIntent, extra: ExtraDragData = {}): DragData => ({
	intent,
	...extra
});

export const extractDragIntent = (data: ExtraDragData | undefined): DragIntent | undefined => {
	if (!data) return undefined;
	return data.intent as DragIntent | undefined;
};

function attachDraggable(node: HTMLElement, config?: PragmaticDraggableConfig) {
	if (!config) {
		node.removeAttribute('draggable');
		return noop;
	}

	const dragHandle = resolveHandle(config.handle);
	const events = pickDefined(config.events);
	const canDrag = resolveCanDrag(config);

	return draggable({
		element: node,
		dragHandle: dragHandle ?? undefined,
		canDrag,
		getInitialData: () => ({ ...(config.getInitialData?.() ?? {}) }),
		getInitialDataForExternal: config.getInitialDataForExternal,
		...events
	});
}

function attachDropTarget(node: HTMLElement, config?: PragmaticDropTargetConfig) {
	if (!config) {
		return noop;
	}

	const events = pickDefined(config.events);
	const canDrop = resolveDropCanDrop(config);

	return dropTargetForElements({
		element: node,
		getData: config.getData,
		canDrop,
		getDropEffect: config.getDropEffect,
		getIsSticky: config.getIsSticky,
		...events
	});
}

function resolveHandle(handle: DragHandle): Element | null | undefined {
	if (typeof handle === 'function') {
		return handle() ?? undefined;
	}
	return handle ?? undefined;
}

function resolveCanDrag(config?: PragmaticDraggableConfig) {
	if (!config) return undefined;
	if (config.enabled === false) {
		return () => false;
	}
	if (config.canDrag) {
		return (args: ElementGetFeedbackArgs) => config.canDrag!(args);
	}
	return undefined;
}

function resolveDropCanDrop(config?: PragmaticDropTargetConfig) {
	if (!config) return undefined;
	if (config.enabled === false) {
		return () => false;
	}
	if (config.canDrop) {
		return (args: ElementDropTargetGetFeedbackArgs) => config.canDrop!(args);
	}
	return undefined;
}

function pickDefined<T extends Record<string, unknown>>(value?: T | null): Partial<T> {
	if (!value) return {};
	return Object.fromEntries(
		Object.entries(value).filter(([, handler]) => typeof handler === 'function')
	) as Partial<T>;
}
