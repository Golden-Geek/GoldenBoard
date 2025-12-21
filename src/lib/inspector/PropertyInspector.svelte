<script lang="ts">
	import { PropertyMode, PropertyType } from '$lib/property/property.svelte';
	import { propertiesInspectorClass } from './inspector.svelte.ts';
	import PropertyContainer from './PropertyContainer.svelte';
	import { saveData } from '$lib/engine/engine.svelte';
	import { fade, slide } from 'svelte/transition';
	import ExpressionEditor from './expression/ExpressionEditor.svelte';

	let { targets, property = $bindable(), propKey, definition, level } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);

	let propertyType = $derived(property ? (definition.type as PropertyType) : PropertyType.NONE);
	let isContainer = $derived(definition.children != null);
	let canDisable = $derived(definition.canDisable ?? false);
	let enabled = $derived(canDisable ? (property.enabled ?? false) : true);

	let Property: any = $derived(
		propertiesInspectorClass[propertyType as keyof typeof propertiesInspectorClass]
	);

	let valueOnFocus = $state.snapshot(property.value);

	function checkAndSaveProperty(force: boolean = false) {
		if (property.value === valueOnFocus && !force) {
			// console.log('No changes detected, skipping save.');
			return;
		}

		saveData('Update ' + definition.name, {
			coalesceID: `${target.id}-property-${level}-${definition.name}`
		});
	}
</script>

<div
	class="property-inspector {isContainer ? 'container' : 'single'} {'level-' + level} {enabled
		? ''
		: 'disabled'}"
>
	{#if isContainer}
		<PropertyContainer {targets} bind:property {propKey} {definition} {level} />
	{:else if target != null && property != null}
		<div class="firstline">
			<div class="property-label">
				{#if canDisable}
					<button
						class="enable-property"
						onclick={() => {
							property.enabled = !enabled ? true : undefined;
							checkAndSaveProperty(true);
						}}
					>
						{enabled ? '🟢' : '⚪'}
					</button>
				{/if}
				{definition.name}
				{#if !definition.readOnly && property.value != definition.default}
					<button
						class="reset-property"
						aria-label="Reset Property"
						onclick={() => {
							property.value = definition.default;
							checkAndSaveProperty();
						}}
						transition:fade={{ duration: 200 }}
					>
						⟲
					</button>
				{/if}
			</div>

			<div class="spacer"></div>
			<Property
				{targets}
				bind:property
				onStartEdit={(value: any) => (valueOnFocus = value)}
				onUpdate={() => checkAndSaveProperty()}
				{definition}
				{propKey}
			/>
			<button
				class="expression-toggle {property.mode ?? PropertyMode.VALUE}"
				onclick={() => {
					property.mode =
						property.mode == PropertyMode.EXPRESSION ? undefined : PropertyMode.EXPRESSION;
					saveData('Set Property Mode', {
						coalesceID: `${target.id}-property-${level}-${definition.name}-mode`
					});
				}}>ƒ</button
			>
		</div>

		{#if property.mode == PropertyMode.EXPRESSION}
			<div class="property-expression" transition:slide={{ duration: 200 }}>
				<ExpressionEditor {targets} bind:property {definition}></ExpressionEditor>
			</div>
		{/if}
	{:else}
		{definition.type} - {target} - {property}
	{/if}
</div>

<style>
	.property-inspector.level-0 {
		margin: 0.25em 0;
	}

	.property-inspector {
		width: 100%;
		display: flex;
		gap: 0.25rem;
		flex-direction: column;
		box-sizing: border-box;
		transition: opacity 0.2s ease;
	}

	.property-inspector .firstline {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.spacer {
		flex-grow: 1;
	}

	.property-inspector.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.property-inspector.single {
		padding: 0.1rem 0.3rem 0.2rem 0;
		border-bottom: solid 1px rgb(from var(--border-color) r g b / 5%);
		min-height: 1.5rem;
	}

	.property-label {
		display: flex;
		align-items: center;
	}

	.enable-property {
		font-size: 0.5rem;
		padding: 0.2rem 0.2rem 0.1rem;
		vertical-align: middle;
		cursor: pointer;
		pointer-events: all;
	}

	.reset-property {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.8rem;
		margin-left: 0.25rem;
		color: var(--text-color);
		padding: 0;
		opacity: 0.5;
		transition: opacity 0.5s;
	}

	.reset-property:hover {
		opacity: 1;
	}

	.expression-toggle {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1rem;
		padding: 0 0.2rem 0 0.5rem;
		color: var(--text-color);
		opacity: 0.5;
		transition: opacity 0.1s;
	}

	.expression-toggle:hover {
		opacity: 1;
	}

	.expression-toggle.expression {
		opacity: 0.9;
		color: var(--expression-color);
		font-weight: bold;
	}

	.property-inspector .property-expression {
		flex-grow: 1;
		width: 100%;
	}
</style>
