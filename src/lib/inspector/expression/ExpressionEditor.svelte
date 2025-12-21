<script lang="ts">
	import { slide } from 'svelte/transition';

	let {
		targets,
		property = $bindable(),
		propKey,
		definition,
		onStartEdit = null,
		onUpdate = null
	} = $props();

	let target = $derived(targets.length > 0 ? targets[0] : null);
	let initExpression = $derived(property.expression);
	let propValue = $derived(target.getPropValue(propKey));
	let errorMessage = $derived(propValue.error);
	let warningMessage = $derived(propValue.warning);

	$inspect('ExpressionEditor', definition);
</script>

<div class="expression-editor-property">
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
	{#if errorMessage != null}
		<div class="error-message" transition:slide={{ duration: 200 }}>
			{errorMessage}
		</div>
	{/if}

	{#if warningMessage != null}
		<div class="warning-message" transition:slide={{ duration: 200 }}>
			{warningMessage}
		</div>
	{/if}
</div>

<style>
	.expression-editor-property {
		display: flex;
		flex-direction: column;
		width: 100%;
		gap: 0.25rem;
	}

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

	.error-message {
		padding: 0.25rem;
		background-color: rgba(from var(--error-color) r g b / 20%);
		color: var(--error-color);
		font-size: 0.75rem;
		border-radius: 4px;
	}

	.warning-message {
		padding: 0.25rem;
		background-color: rgba(from var(--warning-color) r g b / 10%);
		color: var(--warning-color);
		font-size: 0.75rem;
		border-radius: 4px;
	}
</style>
