<script lang="ts">
	let {
		targets,
		expressionMode,
		expressionHasError,
		property = $bindable(),
		shownValue,
		definition,
		onStartEdit = null,
		onUpdate = null
	} = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

<textarea
	class="text-editor-property {expressionMode ? 'expression-mode' : ''} {expressionHasError
		? 'error'
		: ''}"
	disabled={definition.readOnly}
	onchange={(e) => {
		if (expressionMode) return;
		let newValue = (e.target as HTMLTextAreaElement).value;
		// Apply filter function if defined
		if (definition.filterFunction) {
			newValue = definition.filterFunction(newValue);
		}
		property.set(newValue);
		onUpdate && onUpdate();
	}}
	onfocus={() => onStartEdit && onStartEdit()}
	onblur={() => onUpdate && onUpdate()}>{shownValue}</textarea
>

<style>
	.text-editor-property {
	}

	.text-editor-property.expression-mode {
		border-color: var(--expression-color);
	}

	.text-editor-property.error {
		border-color: var(--error-color);
	}
</style>
