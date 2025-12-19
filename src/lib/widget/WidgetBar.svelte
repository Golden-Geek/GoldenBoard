<script lang="ts">
	import {
		widgetDefinitions,
		widgetContainerDefinitions,
		selectedWidgets,
		Widget
	} from './widgets.svelte';

	function addWidgetFromDef(def: any) {
		const lastSelected =
			selectedWidgets.length > 0 ? selectedWidgets[selectedWidgets.length - 1] : null;
		if (lastSelected && lastSelected.isContainer) {
			lastSelected.addWidget(Widget.createFromDefinition(def));
		}
	}
</script>

<div class="widget-bar">
	{#each [...widgetContainerDefinitions, null, ...widgetDefinitions] as widget}
	{#if widget === null}
		<div class="separation"></div>
	{:else}
		<button
			class="widget-button"
			title={widget.name + '\n' + widget.description}
			onclick={() => addWidgetFromDef(widget)}
		>
			<span class="widget-icon">{widget.icon}</span>
		</button>
	{/if}
	{/each}
</div>

<style>
	.widget-bar {
		display: flex;
		gap: 0.1em;
	}

	.separation {
		width: 1px;
		background-color: var(--border-color);
		border: none;
		margin: 0 0.2em;
	}
</style>
