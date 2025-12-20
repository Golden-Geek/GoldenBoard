<script lang="ts">
	let {
		targets,
		property = $bindable(),
		definition,
		onStartEdit = null,
		onUpdate = null
	} = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
	let initValue = $derived(property.value);

	let numberValue = $derived(
		parseFloat(/^(-?\d*\.?\d+)(.*)$/.exec(property.value)?.toString() || '0')
	);

	let unitValue = $derived(
		/^(-?\d*\.?\d+)(.*)$/.exec(property.value)?.[2] ||
			(definition.units ? (definition.units as string[])[0] : 'px')
	);

	let units = $derived(
		(definition.units as string[]) || ['css', 'px', 'em', 'rem', '%', 'vh', 'vw']
	);

	function compute() {
		property.value = `${numberValue}${unitValue}`;
		onUpdate && onUpdate();
	}
</script>

<div class="css-size-property">
	<input
		type="text"
		class="value-property"
		disabled={definition.readOnly}
		bind:value={numberValue}
		onfocus={() => onStartEdit && onStartEdit(initValue)}
		onblur={compute}
		onkeydown={(e) => {
			if (e.key === 'Enter' && onUpdate) onUpdate();
		}}
	/>

	<select
		class="unit-property"
		bind:value={unitValue}
		onchange={compute}
		disabled={definition.readOnly}
	>
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
</style>
