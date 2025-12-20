<script lang="ts">
	import Slider from '$lib/components/Slider.svelte';
	import { PropertyType } from '$lib/property/property.svelte';

	let {
		targets,
		property = $bindable(),
		definition,
		onStartEdit = null,
		onUpdate = null
	} = $props();

	let target = $derived(targets.length > 0 ? targets[0] : null);
	let min = $derived(property.min ? property.min : definition.min);
	let max = $derived(property.max ? property.max : definition.max);
	let hasRange = $derived(min !== undefined && max !== undefined);
	let isInteger = $derived(definition.type === PropertyType.INTEGER);

	let numberInput = $state(null as HTMLInputElement | null);

	function setValueFromField() {
		const newValue = parseFloat(numberInput!.value);
		if (!isNaN(newValue)) {
			property.value = hasRange
				? Math.min(Math.max(newValue, definition.min), definition.max)
				: newValue;
			onUpdate && onUpdate();
		}
	}
</script>

<div class="number-property-container">
	{#if hasRange}
		<Slider
			bind:value={property.value}
			min={definition.min}
			max={definition.max}
			step={definition.step || 0}
			disabled={definition.readOnly}
			onStartEdit={() => onStartEdit && onStartEdit(property.value)}
			onEndEdit={() => onUpdate && onUpdate()}
		/>
	{/if}

	<input
		bind:this={numberInput}
		type="number"
		step="0.01"
		class="number-field {hasRange ? 'with-slider' : 'no-slider'}"
		disabled={definition.readOnly}
		value={property.value.toFixed(isInteger ? 0 : 3)}
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
