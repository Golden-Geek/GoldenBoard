<script lang="ts">
	import PropertyInspector from './PropertyInspector.svelte';

	let { targets, property, definition, level } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

<div class="property-container">
	<pre>{JSON.stringify(property)}</pre>
	{#if property && definition.children}
		{#each Object.entries(definition.children) as [key, childDefinition]}
			<div class="property-child">
				<PropertyInspector
					{targets}
					property={property.children[key]}
					definition={childDefinition}
					{level}
				></PropertyInspector>
			</div>
		{/each}
	{:else}
		<p>No child properties to display.</p>
	{/if}
</div>

<style>
	.property-container {
		padding-left: calc(1rem * var(--level, 0));
	}
	.property-child {
		color: var(--text-color);
		padding: 0.25rem;
		margin-bottom: 0.5rem;
		border: solid 1px var(--border-color);
		min-height: 1rem;
	}
</style>
