<script lang="ts">
	import PropertyInspector from './PropertyInspector.svelte';

	let { targets } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);

	let definitions = $derived(target ? target.getPropertyDefinitions() : null);
	let orderedDefs = $derived(
		Object.entries(definitions).sort(([keyA, valueA], [keyB, valueB]) => {
			if (valueA == undefined) return 1;
			if (valueB == undefined) return -1;
			return ((valueA as any)?.children ? 1 : 0) - ((valueB as any)?.children ? 1 : 0);
		})
	);
</script>

{#key targets}
<div class="inner-inspector">
	{#if target && definitions}
		{#each orderedDefs as [key]}
			<div class="property-item">
				<PropertyInspector
					{targets}
					bind:property={target.props[key]}
					definition={definitions[key]}
					level={0}
					propKey={key}
				></PropertyInspector>
			</div>
		{/each}
	{:else}
		<p>Select something to edit here</p>
	{/if}
</div>
{/key}

<style>
	.inner-inspector {
		width: 100%;
		font-size: 0.8rem;
	}
</style>
