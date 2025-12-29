<script lang="ts">
	import { tick } from 'svelte';
	import {
		PropertyMode,
		PropertyType,
		type Property,
		type PropertyValueType
	} from '$lib/property/property.svelte';
	import { propertiesInspectorClass } from './inspector.svelte.ts';
	import { saveData } from '$lib/engine/engine.svelte';
	import { fade, slide } from 'svelte/transition';
	import ExpressionEditor from './expression/ExpressionEditor.svelte';
	import PropertyContainerInspector from './PropertyContainerInspector.svelte';

	let { targets, property = $bindable(), propKey, definition, level } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);

	let propertyType = $derived(property ? (definition.type as PropertyType) : PropertyType.NONE);
	let isContainer = $derived(definition.children != null);
	let canDisable = $derived(definition.canDisable ?? false);
	let enabled = $derived(canDisable ? (property.enabled ?? false) : true);
	let visible = $derived(
		definition?.visible instanceof Function
			? definition.visible(target)
			: (definition?.visible ?? true)
	);

	//Expression
	let usingExpression = $derived(
		property.mode == PropertyMode.EXPRESSION && property.expression != undefined
	);

	let resolvedValue = $derived(usingExpression ? (property as Property).getResolved() : null);
	let expressionResultTag = $derived(
		resolvedValue?.error ? 'error' : resolvedValue?.warning ? 'warning' : ''
	);

	let expressionMode = $derived(
		usingExpression ? (property.bindingMode ? 'binding' : 'expression') : undefined
	);

	let canManuallyEdit = $derived(
		!definition.readOnly && (!usingExpression || expressionMode === 'binding')
	);

	let propertyInfo: any = $derived(
		propertiesInspectorClass[propertyType as keyof typeof propertiesInspectorClass]
	);

	let PropertyClass: any = $derived(propertyInfo ? propertyInfo.component : null);
	let useFullSpace = $derived(propertyInfo ? (propertyInfo.useFullSpace ?? false) : false);

	let valueOnFocus = undefined as PropertyValueType | undefined;

	let customPropKey = $derived.by((): string | null => {
		const pk = typeof propKey === 'string' ? propKey : String(propKey ?? '');
		if (!pk) return null;
		if (!pk.startsWith('customProps.')) return null;
		const parts = pk.split('.');
		const last = parts[parts.length - 1];
		return last ? String(last) : null;
	});
	let isCustomProperty = $derived(customPropKey != null);

	let isRenaming = $state(false);
	let renameDraft = $state('');

	function checkAndSaveProperty(force: boolean = false) {
		if (property.getRaw() === valueOnFocus && !force) {
			// console.log('No changes detected, skipping save.');
			return;
		}

		saveData('Update ' + definition.name, {
			coalesceID: `${target.id}-property-${level}-${definition.name}`
		});
	}

	function reconcileTargetsAndSave(label: string, coalesceID: string) {
		for (const t of targets ?? []) {
			if (!t?.applySnapshot || !t?.toSnapshot) continue;
			t.applySnapshot(t.toSnapshot(false), { mode: 'patch' });
		}
		saveData(label, { coalesceID });
	}

	async function beginRename() {
		if (!isCustomProperty || definition.readOnly) return;
		renameDraft = definition.name;
		isRenaming = true;
		await tick();
	}

	function commitRename() {
		if (!customPropKey) return;
		const nextName = String(renameDraft ?? '').trim();
		if (!nextName) {
			isRenaming = false;
			return;
		}

		for (const t of targets ?? []) {
			if (!t?.addCustomProperty) continue;
			t.addCustomProperty(customPropKey, {
				type: definition.type as PropertyType,
				name: nextName,
				default: definition.default,
				canDisable: definition.canDisable,
				readOnly: definition.readOnly,
				description: definition.description,
				options: definition.options,
				min: typeof definition.min === 'number' ? definition.min : undefined,
				max: typeof definition.max === 'number' ? definition.max : undefined,
				step: typeof definition.step === 'number' ? definition.step : undefined,
				syntax: definition.syntax
			});
		}

		reconcileTargetsAndSave('Rename Custom Property', `custom-prop-rename-${customPropKey}`);
		isRenaming = false;
	}
</script>

{#if visible}
	<div
		class="property-inspector {isContainer ? 'container' : 'single'} {'level-' + level} {enabled
			? ''
			: 'disabled'}
		{definition.readOnly ? 'readonly' : ''}"
	>
		{#if isContainer}
			<PropertyContainerInspector {targets} bind:property {propKey} {definition} {level} />
		{:else if target != null && property != null}
			<div class="firstline">
				<div class="property-label {expressionResultTag}">
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
					{#if isCustomProperty && !definition.readOnly}
						{#if isRenaming}
							<input
								class="custom-prop-name"
								autofocus
								bind:value={renameDraft}
								onblur={commitRename}
								onkeydown={(e) => {
									if (e.key === 'Enter') commitRename();
									if (e.key === 'Escape') {
										isRenaming = false;
										renameDraft = definition.name;
									}
								}}
							/>
						{:else}
							<span
								class="custom-prop-name-text"
								ondblclick={beginRename}
								title="Double-click to rename"
							>
								{definition.name}
							</span>
						{/if}
					{:else}
						{definition.name}
					{/if}
					{#if !definition.readOnly && property.isValueOverridden()}
						<button
							class="reset-property"
							aria-label="Reset Property"
							onclick={() => {
								property.resetToDefault();
								saveData('Reset Property', {
									coalesceID: `${target.id}-property-${level}-${definition.name}-reset`
								});
							}}
							transition:fade={{ duration: 200 }}
						>
							⟲
						</button>
					{/if}
				</div>

				{#if !useFullSpace}
					<div class="spacer"></div>
				{/if}

				{#if PropertyClass}
					<div
						class="property-wrapper {expressionMode} {canManuallyEdit
							? ''
							: 'readonly'} {useFullSpace ? 'full-space' : ''}"
					>
						<PropertyClass
							{targets}
							bind:property
							onStartEdit={() => (valueOnFocus = property.getRaw())}
							onUpdate={() => checkAndSaveProperty()}
							{definition}
							{propKey}
							{expressionMode}
							{expressionResultTag}
						/>
					</div>

					<button
						class="expression-toggle {expressionMode}"
						disabled={definition.readOnly}
						onclick={() => {
							property.mode =
								property.mode == PropertyMode.EXPRESSION ? undefined : PropertyMode.EXPRESSION;
							saveData('Set Property Mode', {
								coalesceID: `${target.id}-property-${level}-${definition.name}-mode`
							});
						}}>ƒ</button
					>
				{/if}
			</div>

			{#if property.mode == PropertyMode.EXPRESSION && property.expression && (property?.enabled || !canDisable)}
				<div class="property-expression" transition:slide={{ duration: 200 }}>
					<ExpressionEditor
						{targets}
						bind:property
						{definition}
						onUpdate={() => checkAndSaveProperty(true)}
					></ExpressionEditor>
				</div>
			{/if}
		{:else}
			{definition.type} - {target} - {property}
		{/if}
	</div>
{/if}

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
		justify-content: stretch;
		gap: 0.25rem;
	}

	.property-inspector.disabled,
	.property-inspector.readonly {
		opacity: 0.5;
		user-select: none;
		touch-action: none;
		pointer-events: none;
	}

	.spacer {
		flex-grow: 1;
	}

	.property-wrapper {
		display: flex;
		align-items: center;
	}

	.property-wrapper.full-space {
		flex-grow: 1;
		width: 100%;
	}

	.property-wrapper.readonly {
		opacity: 0.6;
		pointer-events: none;
		touch-action: none;
	}

	.property-inspector.single {
		padding: 0.1rem 0.3rem 0.2rem 0;
		border-bottom: solid 1px rgb(from var(--border-color) r g b / 5%);
		min-height: 1.5rem;
	}

	.property-label {
		display: flex;
		align-items: center;
		min-width: max-content;
	}

	.property-label.error {
		color: var(--error-color);
		font-weight: bold;
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

	.custom-prop-name-text {
		cursor: text;
	}

	.custom-prop-name {
		height: 1.5rem;
		background-color: var(--bg-color);
		color: var(--text-color);
		font-size: 0.8rem;
		border: 1px solid rgba(from var(--border-color) r g b / 20%);
		border-radius: 0.25rem;
		padding: 0 0.35rem;
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

	.expression-toggle.binding {
		opacity: 0.9;
		color: var(--binding-color);
		font-weight: bold;
	}

	.property-inspector .property-expression {
		flex-grow: 1;
		width: 100%;
	}
</style>
