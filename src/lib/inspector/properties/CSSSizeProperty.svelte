<script lang="ts">
	import Slider from "$lib/components/Slider.svelte";

	let {
		expressionMode,
		expressionResultTag,
		property = $bindable(),
		definition,
		onStartEdit = null,
		onUpdate = null
	} = $props();

	let val = $derived(property.get());

	let numberValue = $derived(parseFloat(/^(-?\d*\.?\d+)(.*)$/.exec(val)?.toString() || '0'));

	let unitValue = $derived(
		/^(-?\d*\.?\d+)(.*)$/.exec(val)?.[2] ||
			(definition.units ? (definition.units as string[])[0] : 'px')
	);

	let units = $derived((definition.units as string[]) || ['px', 'em', 'rem', '%', 'vh', 'vw']);

	function compute() {
		//if user entered unit in the number field, extract it
		const match = /^(-?\d*\.?\d+)(.*)$/.exec(numberValue.toString());
		if (match) {
			numberValue = parseFloat(match[1]);
			if (match[2]) {
				unitValue = match[2];
			}
		}

		property.set(`${numberValue}${unitValue}`);
		onUpdate && onUpdate();
	}
</script>

<div class="css-size-property {expressionMode} {expressionResultTag}">
	<Slider 
		value={numberValue}
		disabled={definition.readOnly}
		onValueChange={(value: number) => {
			numberValue = value;
			compute();
		}}
		onStartEdit={() => onStartEdit && onStartEdit()}
		onEndEdit={() => onUpdate && onUpdate()}
	/>

	<input
		type="text"
		class="value-property"
		bind:value={numberValue}
		onfocus={() => onStartEdit && onStartEdit()}
		onblur={compute}
		onkeydown={(e) => {
			if (e.key === 'Enter') {
				onUpdate && onUpdate();
				(e.target as HTMLInputElement).blur();
			}
		}}
	/>

	<select class="unit-property" bind:value={unitValue} onchange={compute}>
		{#each units as unit}
			<option value={unit}>{unit}</option>
		{/each}
	</select>
</div>

<style>
	.value-property {
		height: 100%;
		box-sizing: border-box;
		font-size: 0.75rem;
		max-width: 5em;
	}

	.value-property:disabled {
		background-color: var(--inspector-input-disabled-bg);
		color: rgba(from var(--text-color) r g b / 50%);
	}

	.expression-mode {
		.value-property,
		.unit-property {
			color: var(--expression-color);
		}
	}

	.error {
		.value-property,
		.unit-property {
			color: var(--error-color);
		}
	}
</style>
