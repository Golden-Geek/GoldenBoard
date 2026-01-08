<script lang="ts">
	import { mainState } from '$lib/engine/engine.svelte';
	import WidgetContainerRenderer from './WidgetContainerRenderer.svelte';
	import { selectedWidgets } from './widgets.svelte';

	let { board, widget } = $props();

	let editMode = $derived(mainState.editor.editMode);

	let isContainer = $derived(widget.isContainer);
	let WidgetClass = $derived(widget.definition.component || undefined);

	let label = $derived(widget.getSingleProp('label.text').get());
	let showLabel = $derived(widget.getSingleProp('label.showLabel').get());
	let labelPlacement = $derived(widget.getSingleProp('label.labelPlacement').get());

	let highlighted = $derived(mainState.editor.highlightedWidgetID == widget.id);
	let selected = $derived(selectedWidgets.includes(widget));
</script>

<div
	class="widget-renderer label-placement-{labelPlacement}  {isContainer
		? 'widget-container'
		: 'widget-single'}"
	class:widget-highlight={editMode == 'edit' && highlighted}
	class:widget-selected={editMode == 'edit' && selected}
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
>
	<div class="widget-renderer-wrapper">
		{#if showLabel && labelPlacement != 'inside'}
			<label class="widget-label">{label}</label>
		{/if}

		{#if WidgetClass}
			<WidgetClass {board} {widget} label={showLabel && labelPlacement == 'inside' ? label : ''} />
		{:else if isContainer}
			<WidgetContainerRenderer {board} {widget} />
		{:else}
			<p>No component defined for widget type "{widget.type}"</p>
		{/if}
	</div>
</div>

<style>
	.widget-renderer {
		width: 100%;
		height: 100%;
		background-color: rgba(from var(--panel-bg-color) r g b / 1%);
		border-radius: .25rem;
		transition: outline 0.1s ease-in-out;
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
</style>
