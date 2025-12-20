<script lang="ts">
	import { PropertyType } from '$lib/property/property.svelte';
	import { flip } from 'svelte/animate';
	import { propertiesInspectorClass } from './inspector.svelte.ts';
	import PropertyContainer from './PropertyContainer.svelte';
	import { saveData } from '$lib/engine/engine.svelte';

	let { targets, property = $bindable(), definition, level } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);

	let propertyType = $derived(property ? (definition.type as PropertyType) : PropertyType.NONE);
	let isContainer = $derived(definition.children != null);
	let Property: any = $derived(
		propertiesInspectorClass[propertyType as keyof typeof propertiesInspectorClass]
	);

	function savePropertyUpdate() {
		saveData('Update ' + definition.name, {
			coalesceID: `${target.id}-property-${level}-${definition.name}`
		});
	}
</script>

<div class="property-inspector {isContainer ? 'container' : 'single'} {'level-' + level}">
	{#if isContainer}
		<PropertyContainer {targets} bind:property {definition} {level} />
	{:else if target != null && property != null}
		<p class="property-label">{definition.name}</p>
		<Property {targets} bind:property onUpdate={() => savePropertyUpdate()} {definition} />
	{:else}
		{definition.type} - {target != null} - {property}
	{/if}
</div>

<style>
	.property-inspector.level-0 {
		margin: 0.25em 0;
	}

	.property-inspector {
		width: 100%;
		display: flex;
		justify-content: space-between;
		box-sizing: border-box;
		align-items: center;
	}

	.property-inspector.single {
		padding: 0.1rem 0.3rem 0.2rem 0;
		border-bottom: solid 1px rgb(from var(--border-color) r g b / 5%);
		height: 1.5rem;
	}
</style>
