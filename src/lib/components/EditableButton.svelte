<script lang="ts">
	import { tick } from 'svelte';
	import RemoveButton from './RemoveButton.svelte';
	import { saveData } from '$lib/engine.svelte';
	let {
		value = $bindable(),
		editable = false,
		onselect,
		hasRemoveButton,
		onremove = null,
		selected,
		separator = ''
	} = $props();
	let isEditing = $state(false);
	let internalValue = $state(value);

	$effect(() => {
		internalValue = value;
	});

	function setAndSave() {
		value = internalValue;
		isEditing = false;
		saveData('Edit Button Value');
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="button editable-button {selected ? 'selected' : ''} {editable
		? 'editable'
		: 'readonly'} {isEditing ? ' editing' : ''}"
	onclick={onselect}
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
		<span class="first-line">{value.split(separator)[0]}</span><br/>
		<span class="second-line">{value.split(separator)[1]}</span>
	{:else}
		{value}
	{/if}
	{#if hasRemoveButton}
		<div class="remove-bt">
			<RemoveButton
				onclick={(e: any) => {
					e.stopPropagation();
					onremove && onremove();
				}}
			></RemoveButton>
		</div>
	{/if}
</div>

<style>
	.editable-button {
		position: relative;
		padding-right: 1rem;
		line-height: 1rem;
	}

	.editable-button.selected {
		background-color: #0a3e7a !important;
		font-weight: bold;
	}

	.editable-button:hover {
		background-color: #081f46;
	}

	.editable-button.editing {
		/* background-color: var(--panel-bg-color); */
		color: var(--text-color);
		font-weight: normal;
	}

	input {
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
		top: 0;
		right: 0;
		display: none;
	}
</style>
