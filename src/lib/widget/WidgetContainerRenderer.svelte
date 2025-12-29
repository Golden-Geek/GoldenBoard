<script lang="ts">
	import WidgetRenderer from './WidgetRenderer.svelte';

	let { board, widget } = $props();
	let layout = $derived(widget.getSingleProp('layout')?.get());

	let label = $derived(widget.getSingleProp('label.text').get());
	let showLabel = $derived(widget.getSingleProp('label.showLabel').get());
	let labelPlacement = $derived(widget.getSingleProp('label.labelPlacement').get());
</script>

<div class="widget-container-renderer">
	{#if showLabel && labelPlacement == 'inside'}
		<label class="widget-label">{label}</label>
	{/if}
	<div class="widget-children-container layout-{layout}">
		{#each widget.children as childWidget}
			<WidgetRenderer {board} widget={childWidget} />
		{/each}
	</div>
</div>

<style>
	.widget-container-renderer {
		width: 100%;
		height: 100%;
		position: relative;
	}

	label.widget-label {
		position: absolute;
		top: 0.1rem;
		left: 0.1rem;
		font-size: 2rem;
		color: rgba(from var(--panel-bg-color) r g b / 6%);
		text-transform: uppercase;
		font-weight: bold;
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
</style>
