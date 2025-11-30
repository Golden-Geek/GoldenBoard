import type { Board } from '$lib/types/board';
import type { ContainerWidget, Widget } from '$lib/types/widgets';

export function traverseWidgets(
	widget: Widget,
	visitor: (node: Widget, parent?: ContainerWidget) => void,
	parent?: ContainerWidget
): void {
	visitor(widget, parent);
	if (widget.type === 'container') {
		for (const child of widget.children) {
			traverseWidgets(child, visitor, widget);
		}
	}
}

export function findWidget(board: Board, id: string): { widget: Widget; parent?: ContainerWidget } | null {
	let result: { widget: Widget; parent?: ContainerWidget } | null = null;
	traverseWidgets(board.root, (node, parent) => {
		if (node.id === id) {
			result = { widget: node, parent };
		}
	});
	return result;
}

export function updateWidget<T extends Widget>(
	board: Board,
	id: string,
	updater: (widget: T) => T
): Board {
	const cloned = structuredClone(board);
	const target = findWidget(cloned, id);
	if (!target) {
		return board;
	}
	const updated = updater(target.widget as T);
	if (!target.parent) {
		cloned.root = updated as ContainerWidget;
	} else {
		target.parent.children = target.parent.children.map((child) =>
			child.id === id ? (updated as Widget) : child
		);
	}
	return cloned;
}

export function removeWidget(board: Board, id: string): Board {
	const cloned = structuredClone(board);
	if (cloned.root.id === id) {
		throw new Error('Cannot remove root container');
	}

	let removed = false;
	traverseWidgets(cloned.root, (node) => {
		if (node.type !== 'container' || removed) return;
		node.children = node.children.filter((child) => {
			if (child.id === id) {
				removed = true;
				return false;
			}
			return true;
		});
	});
	return cloned;
}

export function insertIntoContainer(
	container: ContainerWidget,
	widget: Widget,
	index?: number
): ContainerWidget {
	const cloned = structuredClone(container);
	if (index === undefined || index < 0 || index > cloned.children.length) {
		cloned.children = [...cloned.children, widget];
	} else {
		cloned.children = [...cloned.children.slice(0, index), widget, ...cloned.children.slice(index)];
	}
	return cloned;
}

export function getWidgetRecord(board: Board): Record<string, Widget> {
	const map: Record<string, Widget> = {};
	traverseWidgets(board.root, (node) => {
		map[node.id] = node;
	});
	return map;
}

export function containsWidget(root: Widget, id: string): boolean {
	if (root.id === id) {
		return true;
	}
	if (root.type !== 'container') {
		return false;
	}
	return root.children.some((child) => containsWidget(child, id));
}
