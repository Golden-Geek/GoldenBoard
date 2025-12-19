<script lang="ts">
	import AddButton from '$lib/components/AddButton.svelte';
	import EditableButton from '$lib/components/EditableButton.svelte';
	import Board from './Board.svelte';
	import { addBoard, removeBoard } from './boards.svelte';
	import { mainState, saveData, EditMode } from '$lib/engine.svelte';

	let selectedBoard = $derived(mainState.selectedBoard);
	let boards = $derived(mainState.boards);
	let editMode = $derived(mainState.editor?.editMode == EditMode.Edit);
</script>

<div class="board-list">
	{#if editMode}
		<AddButton onclick={() => addBoard()} />
	{/if}

	{#each boards as board}
		<EditableButton
			onselect={() => {
				mainState.selectedBoard = board;
				saveData('Select Board', {coalesceID: 'select-board'});
			}}
			editable={true}
			bind:value={board.name}
			hasRemoveButton={boards.length > 1}
			selected={board.isSelected}
			onremove={() => {
				removeBoard(board);
			}}
			color={'var(--board-color)'}
		></EditableButton>
	{/each}
</div>

<Board {selectedBoard} />

<style>
	.board-list {
		display: flex;
		gap: 0.5rem;
	}
</style>
