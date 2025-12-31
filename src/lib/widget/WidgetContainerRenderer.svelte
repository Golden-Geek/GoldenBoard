<script lang="ts">
	import AccordionWidget from './containers/AccordionWidget.svelte';
	import WidgetRenderer from './WidgetRenderer.svelte';

	let { board, widget } = $props();
	let layout = $derived(widget.getSingleProp('layout')?.get());

	let showLabel = $derived(widget.getSingleProp('label.showLabel').get());
	let labelPlacement = $derived(widget.getSingleProp('label.labelPlacement').get());

	let type = $derived(widget.type);
</script>

<div class="widget-container-renderer">
	{#if showLabel && labelPlacement == 'inside'}
		<label class="widget-label">{widget.name}</label>
	{/if}

	{#if type == 'accordion'}
		<AccordionWidget {board} {widget} {layout} {showLabel} {labelPlacement} />
	{:else if type == 'tabbedContainer'}{:else}
		<div class="widget-children-container layout-{layout}">
			{#each widget.children as childWidget}
				<WidgetRenderer {board} widget={childWidget} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.widget-container-renderer {
		width: 100%;
		height: 100%;
		position: relative;
		border: 0.05rem dashed var(--panel-bg-color);
	}

	label.widget-label {
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
</style>
