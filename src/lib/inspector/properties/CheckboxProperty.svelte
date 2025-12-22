<script lang="ts">
	let {
		expressionMode,
		expressionResultTag,
		property = $bindable(),
		definition,
		onUpdate
	} = $props();
</script>

<input
	type="checkbox"
	class="editor-checkbox {expressionMode} {expressionResultTag}"
	disabled={definition.readOnly}
	checked={property.get()}
	onchange={(e) => {
		if (expressionMode) return;
		let newValue = (e.target as HTMLInputElement).checked;
		if (definition.filterFunction) {
			newValue = definition.filterFunction(newValue) as boolean;
		}
		property.set(newValue);
		onUpdate && onUpdate();
	}}
/>

<style>
	.editor-checkbox {
		width: 16px;
		height: 16px;
	}

	input[type='checkbox'].editor-checkbox.expression-mode:checked::after {
		border-color: var(--expression-color);
	}
	input[type='checkbox'].editor-checkbox.error:checked::after {
		border-color: var(--error-color);
	}
</style>
