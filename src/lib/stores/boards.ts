import { browser } from '$app/environment';
import { derived, get, writable } from 'svelte/store';
import { literal, oscBinding, type Binding, type BindingValue } from '$lib/types/binding';
import type { Board, BoardsState } from '$lib/types/board';
import type { Widget, WidgetKind, WidgetTemplate, ContainerWidget } from '$lib/types/widgets';
import { createId } from '$lib/utils/ids';
import { findWidget, insertIntoContainer, removeWidget, updateWidget } from '$lib/utils/tree';
import { pushOscValue } from '$lib/stores/oscquery';

const STORAGE_KEY = 'goldenboard:boards';

function createDefaultBoard(): Board {
	const root = ensureMeta<ContainerWidget>({
		id: createId('container'),
		type: 'container',
		label: 'Root',
		value: literal(null),
		props: {},
		layout: 'vertical',
		css: '',
		children: [createWidget('slider'), createWidget('text-field')]
	});
	return {
		id: createId('board'),
		name: 'Main Board',
		css: '',
		root,
		customWidgets: [],
		sharedProps: {}
	};
}

function loadState(): BoardsState {
	if (browser) {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			try {
				return JSON.parse(raw) as BoardsState;
			} catch (error) {
				console.warn('Failed to parse board state', error);
			}
		}
	}
	const board = createDefaultBoard();
	return {
		boards: [board],
		activeBoardId: board.id,
		selection: { boardId: board.id, widgetId: board.root.id }
	};
}

export const boardsStore = writable<BoardsState>(loadState());

if (browser) {
	boardsStore.subscribe((state) => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	});
}

export const activeBoard = derived(boardsStore, ($state) =>
	$state.boards.find((board) => board.id === $state.activeBoardId)
);

export const selectedWidget = derived([boardsStore, activeBoard], ([$state, $board]) => {
	if (!$board || !$state.selection) return null;
	if ($state.selection.boardId !== $board.id) return null;
	return findWidget($board, $state.selection.widgetId);
});

export function selectBoard(boardId: string): void {
	boardsStore.update((state) => ({
		...state,
		activeBoardId: boardId,
		selection: { boardId, widgetId: findRoot(state, boardId).root.id }
	}));
}

export function selectWidget(widgetId: string): void {
	boardsStore.update((state) => {
		if (!state.selection) return state;
		return { ...state, selection: { ...state.selection, widgetId } };
	});
}

export function addBoard(name = 'New Board'): void {
	boardsStore.update((state) => {
		const board: Board = {
			id: createId('board'),
			name,
			css: '',
			root: ensureMeta<ContainerWidget>({
				id: createId('container'),
				type: 'container',
				label: 'Root',
				value: literal(null),
				props: {},
				layout: 'vertical',
				children: [],
				css: ''
			}),
			customWidgets: [],
			sharedProps: {}
		};
		return {
			boards: [...state.boards, board],
			activeBoardId: board.id,
			selection: { boardId: board.id, widgetId: board.root.id }
		};
	});
}

export function removeBoard(boardId: string): void {
	boardsStore.update((state) => {
		if (state.boards.length === 1) {
			return state;
		}
		const boards = state.boards.filter((board) => board.id !== boardId);
		const nextActive = boardId === state.activeBoardId ? boards[0].id : state.activeBoardId;
		const nextBoard = boards.find((board) => board.id === nextActive) ?? boards[0];
		return {
			boards,
			activeBoardId: nextBoard.id,
			selection: { boardId: nextBoard.id, widgetId: nextBoard.root.id }
		};
	});
}

export function removeWidgetFromBoard(widgetId: string): void {
	boardsStore.update((state) => {
		const board = findRoot(state, state.activeBoardId);
		const updated = removeWidget(board, widgetId);
		return attachBoard(state, updated);
	});
}

export function addWidgetToBoard(kind: WidgetKind, parentId?: string): void {
	boardsStore.update((state) => {
		const board = findRoot(state, state.activeBoardId);
		const updatedBoard = placeWidget(board, createWidget(kind), parentId ?? state.selection?.widgetId);
		return attachBoard(state, updatedBoard);
	});
}

export function insertWidgetInstance(widget: Widget, parentId?: string): void {
	boardsStore.update((state) => {
		const board = findRoot(state, state.activeBoardId);
		const updatedBoard = placeWidget(board, widget, parentId ?? state.selection?.widgetId);
		return attachBoard(state, updatedBoard);
	});
}

export function updateWidgetBindings(widgetId: string, mapper: (props: Widget) => Widget): void {
	boardsStore.update((state) => {
		const board = findRoot(state, state.activeBoardId);
		const updated = updateWidget(board, widgetId, mapper);
		return attachBoard(state, updated);
	});
}

export function setWidgetLiteralValue(widgetId: string, value: BindingValue): void {
	updateWidgetBindings(widgetId, (widget) => {
		if (widget.value.kind === 'literal') {
			return { ...widget, value: literal(value) } as Widget;
		}
		return widget;
	});
}

export function updateBoardCss(css: string): void {
	boardsStore.update((state) => {
		const board = findRoot(state, state.activeBoardId);
		const updated = { ...board, css };
		return attachBoard(state, updated);
	});
}

export function renameWidgetId(widgetId: string, nextId: string): void {
	const trimmed = nextId.trim();
	if (!trimmed) return;
	boardsStore.update((state) => {
		const board = findRoot(state, state.activeBoardId);
		const target = findWidget(board, widgetId);
		if (!target || widgetId === trimmed) return state;
		const collision = findWidget(board, trimmed);
		if (collision) return state;
		const updatedBoard = updateWidget(board, widgetId, (current) => ({ ...current, id: trimmed } as Widget));
		const nextSelection = state.selection && state.selection.widgetId === widgetId
			? { ...state.selection, widgetId: trimmed }
			: state.selection;
		return { ...attachBoard(state, updatedBoard), selection: nextSelection };
	});
}

export function registerCustomWidget(template: WidgetTemplate): void {
	boardsStore.update((state) => {
		const board = findRoot(state, state.activeBoardId);
		const normalized: WidgetTemplate = {
			...template,
			id: template.id ?? createId('custom-template'),
			summary: template.summary ?? template.type
		};
		const next: Board = { ...board, customWidgets: [...board.customWidgets, normalized] };
		return attachBoard(state, next);
	});
}

export function removeCustomWidgetTemplate(templateId: string): void {
	boardsStore.update((state) => {
		const board = findRoot(state, state.activeBoardId);
		const next: Board = {
			...board,
			customWidgets: board.customWidgets.filter((template) => template.id !== templateId)
		};
		return attachBoard(state, next);
	});
}

export function instantiateCustomWidget(templateId: string): void {
	const board = get(activeBoard);
	if (!board) return;
	const template = board.customWidgets.find((item) => item.id === templateId);
	if (!template) return;
	const widget = structuredClone(template.payload);
	widget.id = createId(template.type);
	insertWidgetInstance(widget);
}

export function importBoard(json: string): void {
	try {
		const board = JSON.parse(json) as Board;
		if (!board.id) {
			board.id = createId('board');
		}
		boardsStore.update((state) => ({
			boards: [...state.boards, board],
			activeBoardId: board.id,
			selection: { boardId: board.id, widgetId: board.root.id }
		}));
	} catch (error) {
		console.error('Invalid board json', error);
	}
}

export function exportActiveBoard(): string {
	const board = get(activeBoard);
	return JSON.stringify(board, null, 2);
}

export function propagateWidgetValue(widgetId: string, binding: Binding, rawValue: number | string): void {
	if (binding.kind === 'osc' && binding.path) {
		pushOscValue(binding.path, rawValue);
	}
}

function findRoot(state: BoardsState, boardId: string): Board {
	const board = state.boards.find((b) => b.id === boardId);
	if (!board) {
		throw new Error('Board not found');
	}
	return board;
}

function attachBoard(state: BoardsState, board: Board): BoardsState {
	const boards = state.boards.map((item) => (item.id === board.id ? board : item));
	return { ...state, boards };
}

function placeWidget(board: Board, widget: Widget, targetId?: string): Board {
	const targetInfo = findWidget(board, targetId ?? board.root.id);
	if (!targetInfo) return board;
	const container =
		targetInfo.widget.type === 'container'
			? targetInfo.widget
			: targetInfo.parent ?? board.root;
	const updatedContainer = insertIntoContainer(container, widget);
	return updateWidget(board, updatedContainer.id, () => updatedContainer);
}

export function createWidget(kind: WidgetKind): Widget {
	switch (kind) {
		case 'container':
			return ensureMeta({
				id: createId('container'),
				type: 'container',
				label: 'Container',
				value: literal(null),
				props: {},
				layout: 'vertical',
				css: '',
				children: []
			});
		case 'slider':
			return ensureMeta({
				id: createId('slider'),
				type: 'slider',
				label: 'Slider',
				value: literal(0),
				props: {
					min: literal(0),
					max: literal(1),
					step: literal(0.01)
				},
				css: ''
			});
		case 'int-stepper':
			return ensureMeta({
				id: createId('stepper'),
				type: 'int-stepper',
				label: 'Stepper',
				value: literal(0),
				props: {
					step: literal(1)
				},
				css: ''
			});
		case 'text-field':
			return ensureMeta({
				id: createId('text'),
				type: 'text-field',
				label: 'Text',
				value: literal('0'),
				props: {
					representation: literal('decimal'),
					decimals: literal(2)
				},
				css: ''
			});
		case 'color-picker':
			return ensureMeta({
				id: createId('color'),
				type: 'color-picker',
				label: 'Color',
				value: literal('#ff5500'),
				props: {
					model: literal('hex')
				},
				css: ''
			});
		case 'rotary':
			return ensureMeta({
				id: createId('rotary'),
				type: 'rotary',
				label: 'Rotary',
				value: literal(0),
				props: {
					min: literal(0),
					max: literal(1),
					step: literal(0.01)
				},
				css: ''
			});
	}
}

function ensureMeta<T extends Widget>(widget: T): T {
	const meta = {
		id: widget.meta?.id ?? literal(widget.id),
		label: widget.meta?.label ?? literal(widget.label),
		type: widget.meta?.type ?? literal(widget.type)
	};
	const next = { ...widget, meta } as T;
	if (next.type === 'container') {
		const container = next as typeof next & { children: Widget[] };
		container.children = container.children.map((child) => ensureMeta(child));
		return container;
	}
	return next;
}
