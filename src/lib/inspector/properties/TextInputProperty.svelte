<script lang="ts">

	let {
		property = $bindable(),
		definition,
		expressionMode = false,
		expressionHasError = false,
		shownValue = '',
		onStartEdit = null,
		onUpdate = null
	} = $props();
</script>

<input
	type="text"
	class="text-property {expressionMode ? 'expression' : ''} {expressionHasError ? 'error' : ''}"
	value={shownValue}
	onchange={(e) => {
		if (expressionMode) return;
		let newValue = (e.target as HTMLInputElement).value;
		// Apply filter function if defined
		if (definition.filterFunction) {
			newValue = definition.filterFunction(newValue);
		}
		property.set(newValue);
	}}
	onfocus={() =>
		expressionMode ? null : onStartEdit && onStartEdit($state.snapshot(property.value))}
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
