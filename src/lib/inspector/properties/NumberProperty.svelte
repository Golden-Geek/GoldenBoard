<script lang="ts">
	import Slider from '$lib/components/Slider.svelte';
	import { PropertyType } from '$lib/property/property.svelte';

	let {
		targets,
		property = $bindable(),
		definition,
		onStartEdit = null,
		onUpdate = null,
		expressionMode = false,
		expressionHasError = false,
		shownValue
	} = $props();

	let target = $derived(targets.length > 0 ? targets[0] : null);
	let min = $derived(property.min ? property.min : definition.min);
	let max = $derived(property.max ? property.max : definition.max);
	let hasRange = $derived(min !== undefined && max !== undefined);
	let isInteger = $derived(definition.type === PropertyType.INTEGER);

	let numberInput = $state(null as HTMLInputElement | null);

	function setValueFromField() {
		if (expressionMode) return;

		const newValue = parseFloat(numberInput!.value);
		if (!isNaN(newValue)) {
			property.set(
				hasRange ? Math.min(Math.max(newValue, definition.min), definition.max) : newValue
			);
			onUpdate && onUpdate();
		}
	}
</script>

<div class="number-property-container">
	{#if hasRange}
		<Slider
			value={expressionMode ? shownValue : property.value}
			min={definition.min}
			max={definition.max}
			step={definition.step || 0}
			disabled={definition.readOnly}
			onValueChange={(value: number) => {
				if (expressionMode) return;
				property.set(value);
			}}
			onStartEdit={() => onStartEdit && onStartEdit(property.value)}
			onEndEdit={() => onUpdate && onUpdate()}
			fgColor={expressionMode
				? expressionHasError
					? 'var(--error-color)'
					: 'var(--expression-color)'
				: undefined}
		/>
	{/if}

	<input
		bind:this={numberInput}
		type={expressionMode ? 'text' : 'number'}
		step="0.01"
		class="number-field {hasRange ? 'with-slider' : 'no-slider'} {expressionMode
			? 'expression'
			: ''} {expressionHasError ? 'error' : ''}"
		disabled={definition.readOnly}
		value={expressionMode
			? expressionHasError
				? 'error'
				: shownValue?.toFixed(isInteger ? 0 : 3)
			: property.value?.toFixed(isInteger ? 0 : 3)}
		onfocus={() => onStartEdit && onStartEdit(property.value)}
		onblur={setValueFromField}
		onkeydown={(e) => {
			if (e.key === 'Enter') {
				setValueFromField();
				numberInput!.blur();
			} else if (e.key === 'Escape') {
				numberInput!.value = property.value;
				numberInput!.blur();
			}
		}}
	/>
</div>

<style>
	.number-property-container {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.expression {
		font-style: italic;
		color: var(--expression-color);
	}

	.expression.error {
		color: var(--error-color);
	}

	.number-field {
		height: 100%;
		box-sizing: border-box;
	}

	.number-field.with-slider {
		max-width: 3rem;
		margin-left: 0.25rem;
	}

	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		/* display: none; <- Crashes Chrome on hover */
		-webkit-appearance: none;
		margin: 0; /* <-- Apparently some margin are still there even though it's hidden */
	}
</style>
