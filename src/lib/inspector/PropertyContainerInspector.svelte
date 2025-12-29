<script lang="ts">
	import { slide } from 'svelte/transition';
	import PropertyInspector from './PropertyInspector.svelte';
	import { saveData, menuContext, MenuContextType } from '$lib/engine/engine.svelte';
	import { PropertyType } from '$lib/property/property.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	let { targets, property = $bindable(), propKey, definition, level } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);

	let collapsed = $derived(property.collapsed ?? definition.collapsedByDefault ?? false);
	let color = $derived(definition.color || 'var(--border-color)');

	let visible = $derived(
		definition?.visible instanceof Function
			? definition.visible(target)
			: (definition?.visible ?? true)
	);

	const isCustomPropertiesContainer = $derived(!!definition?.isCustomProperties);

	function reconcileAndSave(label: string, coalesceID: string) {
		for (const t of targets ?? []) {
			if (!t?.applySnapshot || !t?.toSnapshot) continue;
			t.applySnapshot(t.toSnapshot(false), { mode: 'patch' });
		}
		saveData(label, { coalesceID });
	}

	function getExistingCustomPropertyKeys(): Set<string> {
		const keys = new SvelteSet<string>();
		const defChildren = (definition?.children ?? {}) as Record<string, unknown>;
		for (const k of Object.keys(defChildren)) keys.add(k);
		for (const t of targets ?? []) {
			const fromTarget = (t as any)?.getCustomPropertyDefinitions?.();
			if (!fromTarget || typeof fromTarget !== 'object') continue;
			for (const k of Object.keys(fromTarget)) keys.add(k);
		}
		return keys;
	}

	function generateUniqueCustomPropKey(type: PropertyType): string {
		const used = getExistingCustomPropertyKeys();
		const base = type.toString();
		if (!used.has(base)) return base;

		for (let i = 2; i < 1000; i++) {
			const candidate = `${base}_${i}`;
			if (!used.has(candidate)) return candidate;
		}

		return `${base}_${Date.now()}`;
	}

	function addCustomPropertyOfType(type: PropertyType) {
		const key = generateUniqueCustomPropKey(type);

		for (const t of targets ?? []) {
			if (!t?.addCustomProperty) continue;
			t.addCustomProperty(key, { type, name: key });
		}

		reconcileAndSave('Add Custom Property', `custom-prop-add-${key}`);
	}

	function openAddMenu(e: MouseEvent) {
		if (!isCustomPropertiesContainer) return;
		e.preventDefault();
		menuContext.type = MenuContextType.CustomPropertyAdd;
		menuContext.target = {
			addOfType: (t: PropertyType) => addCustomPropertyOfType(t)
		};
		menuContext.position = { x: e.clientX, y: e.clientY };
	}

	function removeCustomProperty(key: string) {
		for (const t of targets ?? []) {
			if (!t?.removeCustomProperty) continue;
			t.removeCustomProperty(key);
		}
		reconcileAndSave('Remove Custom Property', `custom-prop-remove-${key}`);
	}
</script>

{#if visible}
	<div class="property-container" style="--container-color: {color}">
		<div class="property-container-header">
			<span
				class="title-text"
				onclick={() => {
					property.collapsed =
						!collapsed != (definition.collapsedByDefault ?? false) ? !collapsed : undefined;
					saveData('Collapse Container', {
						coalesceID: `${target.id}-property-${level}-${definition.name}-collapse`
					});
				}}
				onkeydown={(e) => {
					if (e.key !== 'Enter' && e.key !== ' ') return;
					e.preventDefault();
					property.collapsed =
						!collapsed != (definition.collapsedByDefault ?? false) ? !collapsed : undefined;
					saveData('Collapse Container', {
						coalesceID: `${target.id}-property-${level}-${definition.name}-collapse`
					});
				}}
				role="switch"
				aria-checked={!collapsed}
				tabindex="0"
			>
				<span class="arrow {collapsed ? '' : 'expanded'}"></span>
				{definition.name || 'Container'}
			</span>

			{#if isCustomPropertiesContainer}
				<button
					class="custom-prop-button"
					onclick={openAddMenu}
					oncontextmenu={openAddMenu}
					title="Add custom property"
				>
					+ Add
				</button>
			{/if}
		</div>

		<div class="property-container-content">
			{#if !collapsed}
				<div class="property-container-children" transition:slide|local={{ duration: 200 }}>
					{#if property && definition.children}
						{#each Object.entries(definition.children) as [key, childDefinition] (key)}
							<div class="child-row">
								<PropertyInspector
									{targets}
									bind:property={property.children[key]}
									definition={childDefinition}
									level={level + 1}
									propKey={propKey + '.' + key}
								></PropertyInspector>

								{#if isCustomPropertiesContainer}
									<button
										class="custom-prop-remove"
										title="Remove custom property"
										onclick={() => removeCustomProperty(key)}
									>
										✕
									</button>
								{/if}
							</div>
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

	.custom-prop-button {
		margin-right: 0.5rem;
		font-size: 0.7rem;
		padding: 0.3rem 0.5rem;
		cursor: pointer;
	}

	.child-row {
		display: flex;
		align-items: flex-start;
		gap: 0.25rem;
	}

	.custom-prop-remove {
		margin-top: 0.2rem;
		font-size: 0.7rem;
		padding: 0.2rem 0.4rem;
		cursor: pointer;
		opacity: 0.6;
	}

	.custom-prop-remove:hover {
		opacity: 1;
	}

	.title-text {
		margin: 0;
		padding: 0.5rem;
		cursor: pointer;
		background-color: rgba(from var(--panel-bg-color) r g b / 2%);
		color: var(--panel-accent-text-color);
		font-weight: bold;
		border-top-left-radius: 0.5rem;
		border-top-right-radius: 0.5rem;
		border-left: solid 3px var(--container-color);
	}

	.property-container-content {
		border-left: solid 3px var(--container-color);
		border-radius: 0 0.25rem 0.25rem 0.25rem;
		background-color: rgba(from var(--panel-bg-color) r g b / 2%);
		min-height: 1rem;
	}

	.property-container-children {
		display: flex;
		flex-direction: column;
		/* gap: 0.5rem; */
		padding: 0.3rem 0 0.3rem 0.3rem;
	}
</style>
