<script lang="ts">
	import PropertyInspector from './PropertyInspector.svelte';

	let { targets, props, level, definitions } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

<div class="property-drawer">
	{#if props}
		{#each Object.entries(props) as [key, property]}
			<div class="property-item">
				<PropertyInspector {targets} {property} definition={definitions[key]} {level}
				></PropertyInspector>
			</div>
		{/each}
	{:else}
		<p>No properties to display.</p>
	{/if}
</div>

<style>
	.property-drawer {
		padding-left: calc(1rem * var(--level, 0));
	}
	.property-item {
		color: var(--text-color);
		padding: 0.25rem;
		margin-bottom: 0.5rem;
		border: solid 1px var(--border-color);
		min-height: 1rem;
	}
</style>
