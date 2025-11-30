import { browser } from '$app/environment';
import { derived, get, writable } from 'svelte/store';
import { setInspectorView } from '$lib/stores/ui';
import { isExpressionValid, literal, oscBinding, type Binding, type BindingValue } from '$lib/types/binding';
import type { Board, BoardsState } from '$lib/types/board';
import type { Widget, WidgetKind, WidgetTemplate, ContainerWidget } from '$lib/types/widgets';
import { createId } from '$lib/utils/ids';
import { containsWidget, findWidget, insertIntoContainer, removeWidget, updateWidget } from '$lib/utils/tree';
import { pushOscValue } from '$lib/stores/oscquery';

const STORAGE_KEY = 'goldenboard:boards';
const HISTORY_LIMIT = 50;
const undoStack: BoardsState[] = [];
const redoStack: BoardsState[] = [];
let suppressHistory = false;

const snapshotState = (state: BoardsState): BoardsState => structuredClone(state);

const pushBounded = (stack: BoardsState[], state: BoardsState) => {
	stack.push(state);
	if (stack.length > HISTORY_LIMIT) {
		stack.shift();
	}
};

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
				return normalizeState(JSON.parse(raw) as BoardsState);
			} catch (error) {
				console.warn('Failed to parse board state', error);
			}
		}
	}
	const board = createDefaultBoard();
	return normalizeState({
		boards: [board],
		activeBoardId: board.id,
		selection: { boardId: board.id, widgetId: board.root.id }
	});
}

export const boardsStore = writable<BoardsState>(loadState());

function updateBoardsState(updater: (state: BoardsState) => BoardsState): void {
	boardsStore.update((state) => {
		const next = updater(state);
		if (next === state) {
			return state;
		}
		if (!suppressHistory) {
			pushBounded(undoStack, snapshotState(state));
			redoStack.length = 0;
		}
		return next;
	});
}

export function undoBoardChange(): void {
	if (!undoStack.length) return;
	const previous = undoStack.pop();
	if (!previous) return;
	suppressHistory = true;
	pushBounded(redoStack, snapshotState(get(boardsStore)));
	boardsStore.set(previous);
	suppressHistory = false;
}

export function redoBoardChange(): void {
	if (!redoStack.length) return;
	const next = redoStack.pop();
	if (!next) return;
	suppressHistory = true;
	pushBounded(undoStack, snapshotState(get(boardsStore)));
	boardsStore.set(next);
	suppressHistory = false;
}

export const canUndoBoardChange = (): boolean => undoStack.length > 0;
export const canRedoBoardChange = (): boolean => redoStack.length > 0;

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
	boardsStore.update((state) => {
		findRoot(state, boardId);
		return {
			...state,
			activeBoardId: boardId,
			selection: undefined
		};
	});
	setInspectorView('board');
}

export function selectWidget(widgetId: string): void {
	boardsStore.update((state) => {
		const boardId = state.selection?.boardId ?? state.activeBoardId;
		if (!boardId) return state;
		return { ...state, selection: { boardId, widgetId } };
	});
	setInspectorView('widget');
}

export function addBoard(name = 'New Board'): void {
	updateBoardsState((state) => {
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
			selection: undefined
		};
	});
	setInspectorView('board');
}

export function removeBoard(boardId: string): void {
	updateBoardsState((state) => {
		if (state.boards.length === 1) {
			return state;
		}
		const boards = state.boards.filter((board) => board.id !== boardId);
		const nextActive = boardId === state.activeBoardId ? boards[0].id : state.activeBoardId;
		const nextBoard = boards.find((board) => board.id === nextActive) ?? boards[0];
		return {
			boards,
			activeBoardId: nextBoard.id,
			selection: undefined
		};
	});
	setInspectorView('board');
}

export function removeWidgetFromBoard(widgetId: string): void {
	updateBoardsState((state) => {
		const board = findRoot(state, state.activeBoardId);
		const updated = removeWidget(board, widgetId);
		return attachBoard(state, updated);
	});
}

export function addWidgetToBoard(kind: WidgetKind, parentId?: string): void {
	updateBoardsState((state) => {
		const board = findRoot(state, state.activeBoardId);
		const updatedBoard = placeWidget(board, createWidget(kind), parentId ?? state.selection?.widgetId);
		return attachBoard(state, updatedBoard);
	});
}

export function insertWidgetInstance(widget: Widget, parentId?: string): void {
	updateBoardsState((state) => {
		const board = findRoot(state, state.activeBoardId);
		const updatedBoard = placeWidget(
			board,
			ensureMeta(structuredClone(widget)),
			parentId ?? state.selection?.widgetId
		);
		return attachBoard(state, updatedBoard);
	});
}

export type WidgetMovePosition = 'before' | 'after' | 'inside';

export function moveWidget(widgetId: string, targetId: string, position: WidgetMovePosition): void {
	if (!widgetId || !targetId || widgetId === targetId) {
		return;
	}
	updateBoardsState((state) => {
		const board = findRoot(state, state.activeBoardId);
		const updated = repositionWidget(board, widgetId, targetId, position);
		if (updated === board) {
			return state;
		}
		return attachBoard(state, updated);
	});
}

export function updateWidgetBindings(widgetId: string, mapper: (props: Widget) => Widget): void {
	updateBoardsState((state) => {
		const board = findRoot(state, state.activeBoardId);
		const updated = updateWidget(board, widgetId, (widget) => sanitizeWidget(mapper(widget)));
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
	updateBoardsState((state) => {
		const board = findRoot(state, state.activeBoardId);
		const updated = { ...board, css };
		return attachBoard(state, updated);
	});
}

export function renameWidgetId(widgetId: string, nextId: string): void {
	const trimmed = nextId.trim();
	if (!trimmed) return;
	updateBoardsState((state) => {
		const board = findRoot(state, state.activeBoardId);
		const target = findWidget(board, widgetId);
		if (!target || widgetId === trimmed) return state;
		const collision = findWidget(board, trimmed);
		if (collision) return state;
		const updatedBoard = updateWidget(board, widgetId, (current) => {
			const meta = { ...(current.meta ?? {}) };
			if (meta.id?.kind === 'literal') {
				meta.id = literal(trimmed);
			}
			return { ...current, id: trimmed, meta } as Widget;
		});
		const nextSelection = state.selection && state.selection.widgetId === widgetId
			? { ...state.selection, widgetId: trimmed }
			: state.selection;
		return { ...attachBoard(state, updatedBoard), selection: nextSelection };
	});
}

export function registerCustomWidget(template: WidgetTemplate): void {
	updateBoardsState((state) => {
		const board = findRoot(state, state.activeBoardId);
		const normalized: WidgetTemplate = {
			...template,
			id: template.id ?? createId('custom-template'),
			summary: template.summary ?? template.type,
			payload: sanitizeWidget(ensureMeta(structuredClone(template.payload)))
		};
		const next: Board = { ...board, customWidgets: [...board.customWidgets, normalized] };
		return attachBoard(state, next);
	});
}

export function removeCustomWidgetTemplate(templateId: string): void {
	updateBoardsState((state) => {
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
		const normalized = normalizeBoard(board);
			updateBoardsState((state) => ({
			boards: [...state.boards, normalized],
			activeBoardId: normalized.id,
			selection: { boardId: normalized.id, widgetId: normalized.root.id }
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

function normalizeBoard(board: Board): Board {
	return {
		...board,
		root: sanitizeWidget(ensureMeta(board.root)),
		customWidgets: (board.customWidgets ?? []).map((template) => ({
			...template,
			payload: sanitizeWidget(ensureMeta(template.payload))
		})),
		sharedProps: sanitizeBindingRecord(board.sharedProps ?? {}, `${board.id}.sharedProps`, null)
	};
}

function normalizeState(state: BoardsState): BoardsState {
	return {
		...state,
		boards: state.boards.map((board) => normalizeBoard(board))
	};
}

function sanitizeBinding(
	binding: Binding | undefined,
	location: string,
	fallback: BindingValue | undefined = undefined
): Binding {
	if (!binding) {
		return literal(fallback ?? '');
	}
	if (binding.kind === 'expression' && !isExpressionValid(binding.code)) {
		console.warn(`Invalid expression binding at ${location}. Falling back to literal value.`);
		const value = fallback ?? binding.code ?? '';
		return literal(value);
	}
	return binding;
}

function sanitizeBindingRecord(
	record: Record<string, Binding>,
	location: string,
	fallback: BindingValue | undefined = undefined
): Record<string, Binding> {
	const entries = Object.entries(record).map(([key, binding]) => [key, sanitizeBinding(binding, `${location}.${key}`, fallback)] as const);
	return Object.fromEntries(entries);
}

function sanitizeWidget<T extends Widget>(widget: T, location = widget.id): T {
	const next = structuredClone(widget) as T;
	next.value = sanitizeBinding(next.value, `${location}.value`, null);
	next.props = sanitizeBindingRecord(next.props ?? {}, `${location}.props`, null);
	if (next.meta) {
		const metaEntries = Object.entries(next.meta).map(([key, binding]) => {
			const fallback = key === 'label' ? next.label : key === 'id' ? next.id : key === 'type' ? next.type : undefined;
			return [key, sanitizeBinding(binding!, `${location}.meta.${key}`, fallback)] as const;
		});
		next.meta = Object.fromEntries(metaEntries);
	}
	if (next.type === 'container') {
		next.children = next.children.map((child) => sanitizeWidget(child, `${location}.${child.id}`));
	}
	return next;
}

function repositionWidget(board: Board, widgetId: string, targetId: string, position: WidgetMovePosition): Board {
	if (widgetId === board.root.id) {
		return board;
	}
	const cloned = structuredClone(board);
	const source = findWidget(cloned, widgetId);
	if (!source || !source.parent) {
		return board;
	}
	const target = findWidget(cloned, targetId);
	if (!target) {
		return board;
	}
	if (containsWidget(source.widget, targetId)) {
		return board;
	}
	const detach = () => {
		source.parent!.children = source.parent!.children.filter((child) => child.id !== widgetId);
	};
	const moving = source.widget;
	if (position === 'inside') {
		if (target.widget.type !== 'container') {
			return board;
		}
		detach();
		target.widget.children = [...target.widget.children, moving];
		return cloned;
	}
	const container = target.parent;
	if (!container) {
		return board;
	}
	detach();
	const siblings = container.children;
	const targetIndex = siblings.findIndex((child) => child.id === targetId);
	if (targetIndex === -1) {
		return board;
	}
	const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
	container.children = [
		...siblings.slice(0, insertIndex),
		moving,
		...siblings.slice(insertIndex)
	];
	return cloned;
}
