<script lang="ts">
	import { slide } from 'svelte/transition';
	import PropertyInspector from './PropertyInspector.svelte';

	let { targets, property, definition, level } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);

	let collapsed = $derived(false);
</script>

<div class="property-container">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="property-container-header"
		onclick={() => (collapsed = !collapsed)}
		role="switch"
		aria-checked={!collapsed}
		tabindex="0"
	>
		<span class="title-text">
			<span class="arrow {collapsed ? '' : 'expanded'}"></span>
			{definition.name || 'Container'}
		</span>
	</div>

	{#if !collapsed}
	<div class="property-container-children" transition:slide|local={{ duration: 200 }}>
		{#if property && definition.children}
			{#each Object.entries(definition.children) as [key, childDefinition]}
				<PropertyInspector
					{targets}
					property={property.children[key]}
					definition={childDefinition}
					level={level + 1}
				></PropertyInspector>
			{/each}
		{:else}
			<p>No child properties to display.</p>
		{/if}
	</div>
	{:else}
		<div class="property-collapsed-container" transition:slide|local={{ duration: 200 }}></div>
	{/if}
</div>

<style>
	.property-container {
		width: 100%;
		display: flex;
		flex-direction: column;
		border-radius: 0.5rem;
		margin: 0.5rem 0;
	}

	.property-container-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		cursor: pointer;
	}

	.title-text {
		margin: 0;
		padding: 0.5rem;

		background-color: rgba(from var(--bg-color) r g b / 80%);
		color: var(--panel-accent-text-color);
		font-weight: bold;
		border-top-left-radius: 0.5rem;
		border-top-right-radius: 0.5rem;
		border-left: solid 3px var(--border-color);
	}

	.property-container-children, .property-collapsed-container {
		display: flex;
		flex-direction: column;
		/* gap: 0.5rem; */
		padding: 0.3rem 0 0.3rem 0.3rem;
		border-left: solid 3px var(--border-color);
		border-radius: 0 0.25rem 0.25rem 0.25rem;
		background-color: rgba(from var(--bg-color) r g b / 80%);
	}
</style>
