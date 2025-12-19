<script lang="ts">
	import PropertyInspector from './PropertyInspector.svelte';

	let { targets, property, definition, level } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

<div class="property-container">
	<div class="property-container-header">
		<span class="title-text">
			{definition.name || 'Container'}
		</span>
	</div>
	<div class="property-container-children">
		{#if property && definition.children}
			{#each Object.entries(definition.children) as [key, childDefinition]}
				<PropertyInspector
					{targets}
					property={property.children[key]}
					definition={childDefinition}
					{level}
				></PropertyInspector>
			{/each}
		{:else}
			<p>No child properties to display.</p>
		{/if}
	</div>
</div>

<style>
	.property-container {
		width: 100%;
		display: flex;
		flex-direction: column;
		border-radius: 0.5rem;
		margin: 0.5rem 0;
	}

	.title-text {
		margin: 0;
		padding:.5rem;
		
		background-color: rgba(from var(--bg-color) r g b / 80%);
		color: var(--panel-accent-text-color);
		font-weight: bold;
		border-top-left-radius: 0.5rem;
		border-top-right-radius: 0.5rem;
        border-left: solid 3px var(--border-color);
	}

	.property-container-children {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.3rem 0 0.3rem 0.3rem;
		border-left: solid 3px var(--border-color);
		border-radius: 0 0.25rem 0.25rem 0.25rem;
		background-color: rgba(from var(--bg-color) r g b / 80%);
	}
</style>
