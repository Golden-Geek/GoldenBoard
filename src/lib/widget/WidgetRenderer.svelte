<script lang="ts">
	import WidgetContainerRenderer from './WidgetContainerRenderer.svelte';

	let { board, widget } = $props();

	let isContainer = $derived(widget.isContainer);
	let WidgetClass = widget.definition.component || undefined;

	let label = $derived(widget.getSingleProp('label.text').get());
	let showLabel = $derived(widget.getSingleProp('label.showLabel').get());
	let labelPlacement = $derived(widget.getSingleProp('label.labelPlacement').get());
</script>

<div class="widget-renderer label-placement-{labelPlacement}">
	{#if showLabel && labelPlacement != 'inside'}
		<label class="widget-label">{label}</label>
	{/if}

	{#if WidgetClass}
		<WidgetClass {board} {widget} label={(showLabel && labelPlacement == 'inside') ? label : ''} />
	{:else if isContainer}
		<WidgetContainerRenderer {board} {widget} />
	{:else}
		<p>No component defined for widget type "{widget.type}"</p>
	{/if}
</div>

<style>
	.widget-renderer {
		width: 100%;
		height: 100%;
		display: flex;
		gap: 0.25rem;
		align-items: center;
		justify-content: center;
		background-color: rgba(from var(--panel-bg-color) r g b / 1%);
		box-sizing: border-box;
		color: var(--gb-color-text-secondary);
		text-align: center;
		border-radius: 0.25rem;
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
