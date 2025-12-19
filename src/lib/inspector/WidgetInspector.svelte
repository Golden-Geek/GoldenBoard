<script lang="ts">
	import { getWidgetDefinitionForType } from '$lib/widget/widgets.svelte';
	import PropertyDrawer from './PropertyDrawer.svelte';

	let { targets } = $props();

	let target = $derived(targets.length > 0 ? targets[0] : null);
	let propertiesDefinitions = $derived(getWidgetDefinitionForType(target?.type)?.props || null);
</script>

<div class="inspector">
	{#if target != null}
		<PropertyDrawer {targets} props={target.props} definitions={propertiesDefinitions} level={0} />
		<!-- <pre>{JSON.stringify(target.toSnapshot(), null, 2)}</pre> -->
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
