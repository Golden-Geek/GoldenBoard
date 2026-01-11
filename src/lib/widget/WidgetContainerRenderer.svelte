<script lang="ts">
	import { dndState } from '$lib/engine/draganddrop.svelte';
	import { mainState } from '$lib/engine/engine.svelte';
	import AccordionWidget from './containers/AccordionWidget.svelte';
	import WidgetRenderer from './WidgetRenderer.svelte';
	import type { Widget } from './widgets.svelte';

	let { board, widget } = $props();
	let layout = $derived(widget.getSingleProp('layout')?.get());

	let showLabel = $derived(widget.getSingleProp('label.showLabel').get());
	let labelPlacement = $derived(widget.getSingleProp('label.labelPlacement').get());

	let type = $derived(widget.type);

	function allowContainerDrop(e: DragEvent): boolean {
		const currentTarget = e.currentTarget as HTMLElement;
		const targetEl = e.target as HTMLElement | null;
		const rect = currentTarget.getBoundingClientRect();
		const edgeMargin = Math.min(32, Math.min(rect.width, rect.height) * 0.15);
		const nearEdge =
			e.clientX - rect.left < edgeMargin ||
			rect.right - e.clientX < edgeMargin ||
			e.clientY - rect.top < edgeMargin ||
			rect.bottom - e.clientY < edgeMargin;

		const hasChildren = (widget.children?.length ?? 0) > 0;
		const overChild = targetEl?.closest('.widget-renderer');
		// Allow dropping into empty containers anywhere; otherwise near borders or when not over a child
		if (!hasChildren) return true;
		if (nearEdge) return true;
		return !overChild;
	}

	function isDescendant(root: Widget, target: Widget): boolean {
		if (!root || !root.children) return false;
		const stack = [...(root.children ?? [])];
		while (stack.length) {
			const current = stack.pop();
			if (current === target) return true;
			if (current?.children) stack.push(...current.children);
		}
		return false;
	}

	let dropInto = $derived(
		dndState.dropCandidate?.type === 'widget' &&
			dndState.dropCandidate?.target === widget &&
			dndState.dropCandidate?.insertInto === true
	);

	let isDragging = $derived(dndState.draggingElements.length > 0);
</script>

<div
	class="widget-container-renderer {isDragging ? 'dragging' : ''} {dropInto ? 'drop-into' : ''}"
	role="group"
	ondragenter={(e) => {
		if (mainState.editor.editMode !== 'edit') return;
		const dragged = dndState.draggingElements[0]?.data;
		if (!dragged) return;
		if (dragged === widget || dragged.parent === widget || isDescendant(dragged, widget)) {
			if (dndState.dropCandidate?.target === widget) dndState.dropCandidate = null;
			return;
		}
		if (!allowContainerDrop(e)) {
			if (dndState.dropCandidate?.target === widget) dndState.dropCandidate = null;
			return;
		}
		dndState.dropCandidate = {
			type: 'widget',
			target: widget,
			position: 'after',
			insertInto: true
		};
		e.preventDefault();
		e.stopPropagation();
	}}
	ondragover={(e) => {
		if (mainState.editor.editMode !== 'edit') return;
		const dragged = dndState.draggingElements[0]?.data;
		if (!dragged) return;
		if (dragged === widget || dragged.parent === widget || isDescendant(dragged, widget)) {
			if (dndState.dropCandidate?.target === widget) dndState.dropCandidate = null;
			return;
		}
		if (!allowContainerDrop(e)) {
			if (dndState.dropCandidate?.target === widget) dndState.dropCandidate = null;
			return;
		}
		dndState.dropCandidate = {
			type: 'widget',
			target: widget,
			position: 'after',
			insertInto: true
		};
		e.preventDefault();
		e.stopPropagation();
	}}
	ondragleave={(e) => {
		if (dndState.dropCandidate?.target === widget && dndState.dropCandidate?.insertInto) {
			dndState.dropCandidate = null;
		}
	}}
>
	{#if showLabel && labelPlacement == 'inside'}
		<span class="widget-label" aria-hidden="true">{widget.name}</span>
	{/if}

	{#if type == 'accordion'}
		<AccordionWidget {board} {widget} {layout} {showLabel} {labelPlacement} />
	{:else if type == 'tabbedContainer'}{:else}
		<div class="widget-children-container layout-{layout}">
			{#each widget.children as childWidget (childWidget)}
				<WidgetRenderer {board} widget={childWidget} />
			{/each}
		</div>
	{/if}

	{#if dropInto}
		<div class="drop-into-overlay" aria-hidden="true"></div>
	{/if}
</div>

<style>
	.widget-container-renderer {
		width: 100%;
		height: 100%;
		position: relative;
		border: 0.05rem dashed var(--panel-bg-color);
		transition: padding 0.2s ease;
	}

	.widget-container-renderer.dragging {
		box-shadow: inset 0 0 12px rgba(from var(--widget-color) r g b / 35%);
		padding: 0.5rem;
	}

	.widget-container-renderer.drop-into {
		padding: 1.5rem;
	}

	.widget-label {
		position: absolute;
		top: 0.1rem;
		left: 0.1rem;
		font-size: 2rem;
		color: rgba(from var(--panel-bg-color) r g b / 6%);
		text-transform: uppercase;
		font-weight: bold;
		pointer-events: none;
		user-select: none;
	}

	.widget-children-container {
		width: 100%;
		height: 100%;
		display: flex;
		gap: 0.25rem;
		box-sizing: border-box;
		padding: 0.25rem;
	}

	.widget-children-container.layout-horizontal {
		flex-direction: row;
	}

	.widget-children-container.layout-vertical {
		flex-direction: column;
	}

	.widget-children-container.layout-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: 0.25rem;
		align-content: stretch;
		align-items: stretch;
		justify-items: stretch;
	}

	.widget-children-container.layout-free {
		display: block;
		position: relative;
		padding: 0.25rem;
		gap: 0;
	}

	.drop-into-overlay {
		position: absolute;
		inset: 0.5rem;
		background-color: rgba(from var(--widget-color) r g b / 15%);
		border-radius: 0.25rem;
		pointer-events: none;
	}
</style>
