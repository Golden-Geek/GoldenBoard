<script lang="ts">
	let {
		targets,
		expressionMode,
		expressionHasError,
		property = $bindable(),
		definition,
		onUpdate
	} = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

<input
	type="checkbox"
	class="editor-checkbox {expressionMode ? 'expression-mode' : ''} {expressionHasError
		? 'error'
		: ''}"
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
