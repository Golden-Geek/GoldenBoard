<script lang="ts">
	import { mainState } from '$lib/engine/engine.svelte';
	import { dndState, handleWidgetDrop, startDrag, stopDrag } from '$lib/engine/draganddrop.svelte';
	import { moveWidget } from './widgets.svelte';
	import WidgetContainerRenderer from './WidgetContainerRenderer.svelte';
	import { selectedWidgets } from './widgets.svelte';

	let { board, widget, canDrag = true } = $props();

	let editMode = $derived(mainState.editor.editMode);

	let isContainer = $derived(widget.isContainer);
	let WidgetClass = $derived(widget.definition.component || undefined);

	let label = $derived(widget.getSingleProp('label.text').get());
	let showLabel = $derived(widget.getSingleProp('label.showLabel').get());
	let labelPlacement = $derived(widget.getSingleProp('label.labelPlacement').get());

	let highlighted = $derived(mainState.editor.highlightedWidgetID == widget.id);
	let selected = $derived(selectedWidgets.includes(widget));

	let draggedWidgets = $derived(dndState.draggingElements.map((d) => d.data));
	let isDragging = $derived(draggedWidgets.length > 0);
	let dropPosition: 'before' | 'after' | null = $derived(
		dndState.dropCandidate?.target === widget ? (dndState.dropCandidate?.position ?? null) : null
	);
	let dropInto = $derived(
		dndState.dropCandidate?.target === widget ? dndState.dropCandidate?.insertInto === true : false
	);
	let parentLayout: 'horizontal' | 'vertical' | 'grid' = $derived(
		(widget.parent?.getSingleProp('layout')?.get() as 'horizontal' | 'vertical' | 'grid' | null) ??
			'vertical'
	);
	let orientation: 'horizontal' | 'vertical' = $derived(
		parentLayout === 'horizontal' || parentLayout === 'grid' ? 'horizontal' : 'vertical'
	);

	function isDescendant(root: any, target: any): boolean {
		if (!root || !root.children) return false;
		const stack = [...(root.children ?? [])];
		while (stack.length) {
			const current = stack.pop();
			if (current === target) return true;
			if (current?.children) stack.push(...current.children);
		}
		return false;
	}

	let isSelfDrag = $derived(draggedWidgets.includes(widget));
	let isInsideDraggedNode = $derived(
		draggedWidgets.some((dragged) => isDescendant(dragged, widget))
	);

	let isRoot = $derived(board.rootWidget === widget);
	let canShowDrop = $derived(
		!isRoot && editMode === 'edit' && isDragging && !isSelfDrag && !isInsideDraggedNode
	);

	function updateDropCandidate(e: DragEvent) {
		if (!canShowDrop) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const useHorizontal = orientation === 'horizontal';
		const midpoint = useHorizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
		const position: 'before' | 'after' = useHorizontal
			? e.clientX < midpoint
				? 'before'
				: 'after'
			: e.clientY < midpoint
				? 'before'
				: 'after';

		dndState.dropCandidate = { type: 'widget', target: widget, position };
	}
</script>

<div
	class="widget-renderer label-placement-{labelPlacement}  {isContainer
		? 'widget-container'
		: 'widget-single'}"
	class:widget-highlight={editMode == 'edit' && highlighted}
	class:widget-selected={editMode == 'edit' && selected}
	role="button"
	tabindex="0"
	onmouseenter={() => {
		if (editMode == 'edit') {
			mainState.editor.highlightedWidgetID = widget.id;
		}
	}}
	onmouseleave={() => {
		if (editMode == 'edit') {
			mainState.editor.highlightedWidgetID = undefined;
		}
	}}
	onclick={(e) => {
		if (editMode == 'edit') {
			e.stopPropagation();
			widget.select(true, !e.shiftKey && !e.ctrlKey && !e.metaKey, false);
		}
	}}
	onkeydown={(e) => {
		if (editMode != 'edit') return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			widget.select(true, true, false);
		}
	}}
	draggable={canDrag && editMode === 'edit' ? 'true' : undefined}
	ondragstart={(e) => {
		if (editMode !== 'edit') return;
		e.dataTransfer?.setData('text/plain', 'widget');
		e.dataTransfer!.effectAllowed = 'move';
		startDrag([{ type: 'widget', htmlElement: e.currentTarget, data: widget }]);
		e.dataTransfer?.setDragImage(e.currentTarget as HTMLElement, 10, 10);
		e.stopPropagation();
	}}
	ondragenter={(e) => {
		if (!canShowDrop) return;
		updateDropCandidate(e);
		e.preventDefault();
		e.stopPropagation();
	}}
	ondragover={(e) => {
		if (!canShowDrop) return;
		updateDropCandidate(e);
		e.preventDefault();
		e.stopPropagation();
	}}
	ondragleave={(e) => {
		if (!canShowDrop) return;
		const next = e.relatedTarget as Node | null;
		if (next && (e.currentTarget as HTMLElement).contains(next)) return;
		if (dndState.dropCandidate?.target === widget) {
			dndState.dropCandidate = null;
		}
		e.stopPropagation();
	}}
	ondragend={(e) => {
		e.preventDefault();
		e.stopPropagation();
	}}

	ondrop={(e) => {
		if (!canShowDrop) return;
		handleWidgetDrop();
		e.preventDefault();
		e.stopPropagation();
	}}
>
	<div class="widget-renderer-wrapper">
		{#if showLabel && labelPlacement != 'inside'}
			<span class="widget-label" aria-hidden="true">{label}</span>
		{/if}

		{#if WidgetClass}
			<WidgetClass {board} {widget} label={showLabel && labelPlacement == 'inside' ? label : ''} />
		{:else if isContainer}
			<WidgetContainerRenderer {board} {widget} />
		{:else}
			<p>No component defined for widget type "{widget.type}"</p>
		{/if}
	</div>

	{#if canShowDrop && (dropPosition || dropInto)}
		<div
			class={`drop-line ${orientation} ${dropPosition ?? 'after'} ${dropInto ? 'into' : ''}`}
			aria-hidden="true"
			role="separator"
		></div>
	{/if}
</div>

<style>
	.widget-renderer {
		width: 100%;
		height: 100%;
		background-color: rgba(from var(--panel-bg-color) r g b / 1%);
		border-radius: 0.25rem;
		transition: outline 0.1s ease-in-out;
		position: relative;
	}

	.widget-renderer-wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		box-sizing: border-box;
		text-align: center;
	}

	:global(.mode-edit) {
		.widget-renderer {
			outline: 2px dashed rgba(from var(--panel-bg-color) r g b / 5%);
		}

		.widget-renderer:hover {
			outline: 2px dashed rgba(from var(--panel-bg-color) r g b / 10%);
		}

		.widget-renderer:global(.widget-highlight) {
			outline: 2px solid rgba(from var(--accent-color) r g b / 40%);
			background-color: rgba(from var(--accent-color) r g b / 5%);
		}

		.widget-renderer:global(.widget-selected) {
			outline: 2px solid var(--widget-color);
			background-color: rgba(from var(--widget-color) r g b / 10%);
		}

		.widget-renderer.widget-single .widget-renderer-wrapper {
			pointer-events: none;
			touch-action: none;
			user-select: none;
		}
	}

	.widget-renderer.label-placement-top {
		flex-direction: column;
	}

	.widget-renderer.label-placement-bottom {
		flex-direction: column-reverse;
	}

	.widget-renderer.label-placement-left {
		flex-direction: row;
	}

	.widget-renderer.label-placement-right {
		flex-direction: row-reverse;
	}

	.drop-line {
		position: absolute;
		pointer-events: none;
		z-index: 2;
	}

	.drop-line.vertical.before {
		top: 0;
		left: 0;
		right: 0;
		border-top: 2px solid rgba(from var(--widget-color) r g b / 80%);
		box-shadow: 0 0 6px rgba(from var(--widget-color) r g b / 35%);
	}

	.drop-line.vertical.after {
		bottom: 0;
		left: 0;
		right: 0;
		border-top: 2px solid rgba(from var(--widget-color) r g b / 80%);
		box-shadow: 0 0 6px rgba(from var(--widget-color) r g b / 35%);
	}

	.drop-line.horizontal.before {
		top: 0;
		bottom: 0;
		left: 0;
		border-left: 2px solid rgba(from var(--widget-color) r g b / 80%);
		box-shadow: 0 0 6px rgba(from var(--widget-color) r g b / 35%);
	}

	.drop-line.horizontal.after {
		top: 0;
		bottom: 0;
		right: 0;
		border-left: 2px solid rgba(from var(--widget-color) r g b / 80%);
		box-shadow: 0 0 6px rgba(from var(--widget-color) r g b / 35%);
	}

	.drop-line.into {
		inset: 2px;
		border: 2px dashed rgba(from var(--widget-color) r g b / 40%);
		box-shadow: inset 0 0 6px rgba(from var(--widget-color) r g b / 25%);
		border-top: none;
		border-left: none;
	}
</style>
