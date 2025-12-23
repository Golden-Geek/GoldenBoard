<script lang="ts">
	import { slide } from 'svelte/transition';
	import PropertyInspector from './PropertyInspector.svelte';
	import { saveData } from '$lib/engine/engine.svelte';

	let { targets, property = $bindable(), propKey, definition, level } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);

	let collapsed = $derived(property.collapsed ?? definition.collapsedByDefault ?? false);
	let color = $derived(definition.color || 'var(--border-color)');

	let visible = $derived(
		definition?.visible instanceof Function
			? definition.visible(target)
			: (definition?.visible ?? true)
	);
</script>

{#if visible}
	<div class="property-container" style="--container-color: {color}">
		<div class="property-container-header" tabindex="0">
			<span
				class="title-text"
				onclick={() => {
					property.collapsed =
						!collapsed != (definition.collapsedByDefault ?? false) ? !collapsed : undefined;
					saveData('Collapse Container', {
						coalesceID: `${target.id}-property-${level}-${definition.name}-collapse`
					});
				}}
				role="switch"
				aria-checked={!collapsed}
			>
				<span class="arrow {collapsed ? '' : 'expanded'}"></span>
				{definition.name || 'Container'}
			</span>
		</div>

		<div class="property-container-content">
			{#if !collapsed}
				<div class="property-container-children" transition:slide|local={{ duration: 200 }}>
					{#if property && definition.children}
						{#each Object.entries(definition.children) as [key, childDefinition]}
							<PropertyInspector
								{targets}
								bind:property={property.children[key]}
								definition={childDefinition}
								level={level + 1}
								propKey={propKey + '.' + key}
							></PropertyInspector>
						{/each}
					{:else}
						<p>No child properties to display.</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}

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
	}

	.title-text {
		margin: 0;
		padding: 0.5rem;
		cursor: pointer;
		background-color: rgba(from var(--bg-color) r g b / 80%);
		color: var(--panel-accent-text-color);
		font-weight: bold;
		border-top-left-radius: 0.5rem;
		border-top-right-radius: 0.5rem;
		border-left: solid 3px var(--container-color);
	}

	.property-container-content {
		border-left: solid 3px var(--container-color);
		border-radius: 0 0.25rem 0.25rem 0.25rem;
		background-color: rgba(from var(--bg-color) r g b / 80%);
		min-height: 1rem;
	}

	.property-container-children {
		display: flex;
		flex-direction: column;
		/* gap: 0.5rem; */
		padding: 0.3rem 0 0.3rem 0.3rem;
	}
</style>
