<script lang="ts">
	import { PropertyType } from '$lib/property/property.svelte';
	import { propertiesInspectorClass } from './inspector.svelte';
	import PropertyContainer from './PropertyContainer.svelte';

	let { targets, property, definition, level } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);

	let propertyType = $derived(property ? (definition.type as PropertyType) : PropertyType.NONE);
	let isContainer = $derived(definition.children != null);
	let Property = $derived(propertiesInspectorClass[propertyType!]);
</script>

<div class="property-inspector">
	PINSPECTOR
	{#if isContainer}
		<PropertyContainer {targets} {property} {definition} {level} />
	{:else if target != null && property != null}
		<Property {targets} {property} />
	{:else}
		{definition.type} - {target != null} - {property}
	{/if}
</div>

<style>
</style>
