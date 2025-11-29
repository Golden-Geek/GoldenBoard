import type { Binding } from './binding';
import type { ContainerWidget, Widget, WidgetTemplate } from './widgets';

export interface BoardTheme {
	css: string;
	functions: Record<string, string>;
}

export interface Board {
	id: string;
	name: string;
	css?: string;
	root: ContainerWidget;
	customWidgets: WidgetTemplate[];
	sharedProps: Record<string, Binding>;
}

export interface SelectionState {
	boardId: string;
	widgetId: string;
}

export interface BoardsState {
	boards: Board[];
	activeBoardId: string;
	selection?: SelectionState;
}

export type WidgetVisitor = (widget: Widget, parent?: ContainerWidget) => void;
