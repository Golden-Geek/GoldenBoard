<script lang="ts">
	import { getWidgetByID } from '$lib/engine.svelte';
	let { targets } = $props();

	let target = $derived(targets.length > 0 ? getWidgetByID(targets[0]) : null);
</script>

<div class="inspector">
	{#if target != null}
		<h2>Inspector</h2>
		<pre>{JSON.stringify(target, null, 2)}</pre>
	{:else}
		{getWidgetByID(targets[0])}
		<p>Select something to edit here</p>
	{/if}
</div>

<style>
	.inspector {
		width: 100%;
		height: 100%;
		font-size: 0.8rem;
	}
</style>
