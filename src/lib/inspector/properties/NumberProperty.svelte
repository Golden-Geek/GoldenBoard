<script lang="ts">
	import Slider from '$lib/components/Slider.svelte';
	import { PropertyType } from '$lib/property/property.svelte';

	let {
		targets,
		property = $bindable(),
		definition,
		onStartEdit = null,
		onUpdate = null,
		expressionMode,
		expressionResultTag
	} = $props();

	let target = $derived(targets.length > 0 ? targets[0] : null);
	let min = $derived(
		definition.min instanceof Function ? definition.min(target, property) : definition.min
	);
	let max = $derived(
		definition.max instanceof Function ? definition.max(target, property) : definition.max
	);
	let step = $derived(
		definition.step instanceof Function ? definition.step(target, property) : definition.step || 0
	);

	let hasRange = $derived(min !== undefined && max !== undefined);
	let isInteger = $derived(definition.type === PropertyType.INTEGER);

	let numberInput = $state(null as HTMLInputElement | null);

	let sliderColor = $derived(
		expressionMode == 'expression'
			? `var(--${expressionMode}-color)`
			: expressionMode == 'binding'
				? `var(--binding-color)`
				: undefined
	);

	function setValueFromField() {
		const newValue = parseFloat(numberInput!.value);
		console.log('Parsed value:', newValue);
		if (!isNaN(newValue)) {
			property.set(hasRange ? Math.min(Math.max(newValue, min), max) : newValue);
			onUpdate && onUpdate();
		}
	}
</script>

<div class="number-property-container">
	<Slider
		value={property.get()}
		{min}
		{max}
		{step}
		disabled={definition.readOnly}
		onValueChange={(value: number) => {
			property.set(value);
		}}
		onStartEdit={() => onStartEdit && onStartEdit()}
		onEndEdit={() => onUpdate && onUpdate()}
		fgColor={sliderColor}
	/>

	<input
		bind:this={numberInput}
		type={expressionMode ? 'text' : 'number'}
		step="0.01"
		class="number-field {expressionMode} {expressionResultTag}"
		disabled={definition.readOnly}
		value={property.get()?.toFixed(isInteger ? 0 : 3)}
		onfocus={() => onStartEdit && onStartEdit()}
		onblur={setValueFromField}
		onkeydown={(e) => {
			if (e.key === 'Enter') {
				setValueFromField();
				numberInput!.blur();
			} else if (e.key === 'Escape') {
				numberInput!.value = property.getRaw();
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
		max-width: 4rem;
		margin-left: 0.25rem;
	}

	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		/* display: none; <- Crashes Chrome on hover */
		-webkit-appearance: none;
		margin: 0; /* <-- Apparently some margin are still there even though it's hidden */
	}
</style>
