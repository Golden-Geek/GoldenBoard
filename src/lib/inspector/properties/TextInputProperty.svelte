<script lang="ts">
	let {
		property = $bindable(),
		definition,
		expressionMode,
		expressionResultTag,
		onStartEdit = null,
		onUpdate = null
	} = $props();

</script>

<input
	type="text"
	class="text-property {expressionMode} {expressionResultTag}"
	value={property.get()}
	onchange={(e) => {
		let newValue = (e.target as HTMLInputElement).value;
		// Apply filter function if defined
		if (definition.filterFunction) {
			newValue = definition.filterFunction(newValue);
		}
		property.set(newValue);
	}}
	onfocus={() => (expressionMode ? null : onStartEdit && onStartEdit())}
	onblur={() => (expressionMode ? null : onUpdate && onUpdate())}
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
	}

	.text-property.expression {
		font-style: italic;
		color: rgba(from var(--expression-color) r g b) !important;
	}

	.text-property.binding {
		color: rgba(from var(--binding-color) r g b) !important;
	}

	.text-property.expression.error {
		color: rgba(from var(--error-color) r g b) !important;
	}

	.text-property:disabled {
		background-color: var(--inspector-input-disabled-bg);
		color: rgba(from var(--text-color) r g b / 50%);
	}
</style>
