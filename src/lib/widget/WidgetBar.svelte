<script lang="ts">
	import { widgetDefinitions, widgetContainerDefinitions } from './widgets.svelte';
</script>

<div class="widget-bar">
	{#each widgetDefinitions as widget}
		<button class="widget-button" title={widget.name + "\n" + widget.description}>
			<span class="widget-icon">{widget.icon}</span>
		</button>
	{/each}

	<div class="separation" />
	{#each widgetContainerDefinitions as widget}
		<button class="widget-button" title={widget.name + "\n" + widget.description}>
			<span class="widget-icon">{widget.icon}</span>
		</button>
	{/each}
</div>

<style>
	.widget-bar {
        display: flex;
        gap:.1em;
	}

    .separation {
        width:1px;
        background-color: var(--border-color);
        border:none;
        margin:0 .2em;
    }
</style>
