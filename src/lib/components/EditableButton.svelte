<script lang="ts">
	import { tick } from 'svelte';
	import RemoveButton from './RemoveButton.svelte';
	import { saveData } from '$lib/engine.svelte';
	let { value = $bindable(), onselect, hasRemoveButton, onremove = null, selected } = $props();
	let isEditing = $state(false);

	let internalValue = $state(value);

	$effect(() => {
		internalValue = value;
	});

	function setAndSave() {
		value = internalValue;
		isEditing = false;
        saveData("Edit Button Value");
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="button editable-button {selected ? 'selected' : ''}"
	onclick={onselect}
	ondblclick={() => {
		isEditing = !isEditing;
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
	{:else}
		{value}
	{/if}

	{#if hasRemoveButton}
		<RemoveButton
			onclick={(e: any) => {
				e.stopPropagation();
				onremove && onremove();
			}}
		></RemoveButton>
	{/if}
</div>

<style>
    .editable-button.selected {
		background-color: #1e89d5;
		color: #222;
		font-weight: bold;
	}

	.editable-button:hover {
		background-color: #1348a4;
		color: #222;
	}
</style>
