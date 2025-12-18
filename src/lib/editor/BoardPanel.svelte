<script lang="ts">
	import AddButton from '$lib/components/AddButton.svelte';
	import EditableButton from '$lib/components/EditableButton.svelte';
	import Board from '$lib/board/Board.svelte';
	import { addBoard, removeBoard, type BoardData } from '$lib/board/boards.svelte';
	import { mainData, saveData } from '$lib/engine.svelte';
	import { EditMode } from './editor.svelte';

	let selectedBoard: BoardData | null = $derived(
		mainData.boardData.selectedBoard
			? mainData.boardData.boards.find((b) => b.name === mainData.boardData.selectedBoard) || null
			: null
	);

	let boards = $derived(mainData.boardData.boards);
	let board: BoardData = $derived(boards.find((b) => b.name === mainData.boardData.selectedBoard)!);

	$effect(() => {
		if (selectedBoard == null && boards.length > 0) {
			mainData.boardData.selectedBoard = boards[0].name;
		}
	});

	let editMode = $derived(mainData.editor.editMode == EditMode.Edit);
</script>

<div class="board-list">
	{#if editMode}
		<AddButton onclick={() => addBoard()} />
	{/if}

	{#each boards as board}
		<EditableButton
			onselect={() => {
				mainData.boardData.selectedBoard = board.name;
				saveData("Select Board");
			}}
			bind:value={board.name}
			hasRemoveButton={boards.length > 1}
			selected={selectedBoard == board}
			onremove={() => {
				removeBoard(board);
			}}
		></EditableButton>
	{/each}
</div>

<Board {board} />

<style>
	.board-list {
		display: flex;
		gap:.5rem;
	}
</style>
