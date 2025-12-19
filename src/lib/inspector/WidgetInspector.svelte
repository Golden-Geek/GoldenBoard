<script lang="ts">
	let { targets } = $props();

	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

<div class="inspector">
	{#if target != null}
		<h2>Inspector</h2>
		<pre>{JSON.stringify(target, null, 2)}</pre>
	{:else}
		{target}
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
