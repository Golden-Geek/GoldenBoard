<script lang="ts">
	import { InspectableWithProps, PropertyMode } from '$lib/property/property.svelte';

	let {
		targets,
		property = $bindable(),
		definition,
		propKey,
		onStartEdit = null,
		onUpdate = null
	} = $props();

	let target = $derived(targets.length > 0 ? targets[0] : null) as InspectableWithProps;
	let expressionMode = $derived(property.mode == PropertyMode.EXPRESSION);

	let resolvedValue = $derived(expressionMode ? target?.getPropValue(propKey) : null);
	let expressionHasError = $derived(resolvedValue?.error != null);
	let shownValue = $derived(
		expressionMode ? (resolvedValue?.error ?? resolvedValue?.current!) : property.value
	);

	let initValue = $derived(property.value);
</script>

<input
	type="text"
	class="text-property {expressionMode ? 'expression' : ''} {expressionHasError ? 'error' : ''}"
	disabled={definition.readOnly || expressionMode}
	value={shownValue}
	onchange={(e) => {
		if (expressionMode) return;
		let newValue = (e.target as HTMLInputElement).value;
		// Apply filter function if defined
		if (definition.filterFunction) {
			newValue = definition.filterFunction(newValue);
		}
		property.value = newValue;
	}}
	onfocus={() => (expressionMode ? null : onStartEdit && onStartEdit(initValue))}
	onblur={() => (expressionMode ? null : onUpdate && onUpdate())}
	onkeydown={(e) => {
		if (expressionMode) return;
		if (e.key === 'Enter') {
			onUpdate && onUpdate();
			(e.target as HTMLInputElement).blur();
		}
	}}
/>

<style>
	.text-property {
		height: 100%;
		box-sizing: border-box;
		font-size: 0.75rem;
	}

	.text-property.expression {
		font-style: italic;
		background-color: rgba(from var(--expression-color) r g b / 20%) !important;
	}

	.text-property.expression.error {
		background-color: rgba(from var(--error-color) r g b / 20%) !important;
	}

	.text-property:disabled {
		background-color: var(--inspector-input-disabled-bg);
		color: rgba(from var(--text-color) r g b / 50%);
	}
</style>
