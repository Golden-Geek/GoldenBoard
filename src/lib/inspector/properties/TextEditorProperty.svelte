<script lang="ts">
	let {
		targets,
		expressionMode,
		expressionResultTag,
		property = $bindable(),
		definition,
		onStartEdit = null,
		onUpdate = null
	} = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

<textarea
	class="text-editor-property {expressionMode} {expressionResultTag}"
	disabled={definition.readOnly}
	onchange={(e) => {
		let newValue = (e.target as HTMLTextAreaElement).value;
		// Apply filter function if defined
		if (definition.filterFunction) {
			newValue = definition.filterFunction(newValue);
		}
		property.set(newValue);
		onUpdate && onUpdate();
	}}
	onfocus={() => onStartEdit && onStartEdit()}
	onblur={() => onUpdate && onUpdate()}>{property.get()}</textarea
>

<style>
	/* .text-editor-property {
	} */

	.text-editor-property.expression-mode {
		color: var(--expression-color);
	}

	.text-editor-property.error {
		color: var(--error-color);
	}
</style>
