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
		width: 100%;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
	}

	.property-item {
		color: var(--text-color);
		width: 100%;
	}
</style>
