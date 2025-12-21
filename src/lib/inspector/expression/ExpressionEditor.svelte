<script lang="ts">
	let {
		targets,
		property = $bindable(),
		definition,
		onStartEdit = null,
		onUpdate = null
	} = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);

	let initExpression = $derived(property.expression);
</script>

<input
	type="text"
	class="text-property"
	disabled={definition.readOnly}
	value={property.expression}
	onchange={(e) => {
		let newValue = (e.target as HTMLInputElement).value;
		// Apply filter function if defined
		if (definition.filterFunction) {
			newValue = definition.filterFunction(newValue);
		}
		property.expression = newValue == '' ? undefined : newValue;
	}}
	onfocus={() => onStartEdit && onStartEdit(initExpression)}
	onblur={() => onUpdate && onUpdate()}
	onkeydown={(e) => {
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
		width: 100%;
		color: var(--expression-color);
	}

	.text-property:disabled {
		background-color: var(--inspector-input-disabled-bg);
		color: rgba(from var(--text-color) r g b / 50%);
	}
</style>
