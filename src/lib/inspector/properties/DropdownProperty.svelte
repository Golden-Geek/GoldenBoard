<script lang="ts">
	let {
		targets,
		expressionMode,
		expressionHasError,
		property = $bindable(),
		definition,
		onUpdate = null
	} = $props();
</script>

<select
	class="dropdown-property {expressionMode ? 'expression-mode' : ''} {expressionHasError
		? 'error'
		: ''}"
	value={property.get()}
	onchange={(event) => {
		if (expressionMode) return;
		let newValue = (event.target as HTMLSelectElement).value;
		// Apply filter function if defined
		if (definition.filterFunction) {
			newValue = definition.filterFunction(newValue);
		}
		property.set(newValue);
		onUpdate && onUpdate();
	}}
>
	{#each Object.entries(definition.options) as [optionKey, optionLabel]}
		<option value={optionKey}>{optionLabel}</option>
	{/each}
</select>

<style>
	/* .dropdown-property {
	} */

	.dropdown-property.expression-mode {
		color: var(--expression-color);
	}

	.dropdown-property.error {
		color: var(--error-color);
	}
</style>
