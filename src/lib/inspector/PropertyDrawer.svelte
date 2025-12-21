<script lang="ts">
	import PropertyInspector from './PropertyInspector.svelte';

	let { targets, props = $bindable(), level, definitions } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);

	let orderedDefs = $derived(
		Object.entries(definitions).sort(([keyA, valueA], [keyB, valueB]) => {
			if (valueA == undefined) return 1;
			if (valueB == undefined) return -1;
			return ((valueA as any)?.children ? 1 : 0) - ((valueB as any)?.children ? 1 : 0);
		})
	);

	$inspect('PropertyDrawer', target, props);
</script>

<div class="property-drawer">
	{#if props}
		{#each orderedDefs as [key, property]}
			<div class="property-item">
				<PropertyInspector
					{targets}
					bind:property={props[key]}
					definition={definitions[key]}
					{level}
					propKey={key}
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
