<script lang="ts">
	import { tick } from 'svelte';
	import RemoveButton from './RemoveButton.svelte';
	import { saveData } from '$lib/engine/engine.svelte';
	let {
		value = $bindable(),
		editable = false,
		onSelect,
		hasRemoveButton,
		onRemove = null,
		onChange = null,
		selected,
		separator = '',
		warning = '',
		extraClass = '',
		color = ''
	} = $props();
	let isEditing = $state(false);
	let internalValue = $state(value || '[error]');

	$effect(() => {
		internalValue = value;
	});

	function setAndSave() {
		value = internalValue;
		isEditing = false;

		if (onChange) {
			onChange(internalValue);
		} else {
			saveData('Edit Button Value');
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="button editable-button {selected ? 'selected' : ''} {editable
		? 'editable'
		: 'readonly'} {isEditing ? ' editing' : ''} 
		{separator !== '' ? 'has-separator' : ''}
		{warning !== '' ? 'warning' : ''}
		{extraClass}"
	style={color ? `--bt-color:${color}` : ''}
	title={warning}
	onclick={onSelect}
	ondblclick={() => {
		if (!editable) return;
		isEditing = true;
		if (isEditing) {
			// Focus the input after it appears
			tick().then(() => {
				const input = document.querySelector('.button input') as HTMLInputElement;
				if (input) {
					input.focus();
					input.select();
				}
			});
		}
	}}
	onkeydown={(e) => {}}
>
	{#if isEditing}
		<input
			type="text"
			bind:value={internalValue}
			onblur={setAndSave}
			onkeydown={(e) => {
				if (e.key === 'Enter') {
					setAndSave();
					isEditing = false;
				} else if (e.key === 'Escape') {
					internalValue = value;
					isEditing = false;
				}
			}}
		/>
	{:else if separator !== ''}
		<span class="first-line">{value?.split(separator)[0]}</span><br />
		<span class="second-line">{value?.split(separator)[1]}</span>
	{:else}
		{value}
	{/if}
	{#if hasRemoveButton}
		<div class="remove-bt">
			<RemoveButton
				onclick={(e: any) => {
					e.stopPropagation();
					onRemove && onRemove();
				}}
			></RemoveButton>
		</div>
	{/if}
</div>

<style>
	.editable-button {
		position: relative;
		--bt-color: var(--button-bg-color);
		transition: background-color 0.1s ease;
	}

	.editable-button.has-separator {
		line-height: 1rem;
	}

	.editable-button.warning {
		color: var(--warning-color);
	}

	.editable-button.selected {
		background-color: var(--bt-color) !important;
		font-weight: bold;
		color: var(--text-color);
	}

	.editable-button:hover {
		background-color: hsl(from var(--bt-color) h s l / 50%);
	}

	.editable-button.editing {
		/* background-color: var(--panel-bg-color); */
		color: var(--text-color);
		font-weight: normal;
	}

	input {
		height: 1.5rem;
		background-color: var(--bg-color);
		font-size: 0.8rem;
		display: inline;
	}

	.second-line {
		font-size: 0.65rem;
		color: rgba(from var(--text-color) r g b / 50%);
	}

	.editable-button:hover .remove-bt {
		display: block;
	}

	.remove-bt {
		position: absolute;
		top: -6px;
		right: -6px;
		display: none;
	}
</style>
