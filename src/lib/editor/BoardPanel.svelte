<script lang="ts">
	import AddButton from '$lib/components/AddButton.svelte';
	import EditableButton from '$lib/components/EditableButton.svelte';
	import Board from '$lib/board/Board.svelte';
	import { addBoard, removeBoard, type BoardData } from '$lib/board/boards.svelte';
	import { mainData } from '$lib/engine.svelte';
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
</script>

<div class="board-list">
	{#if mainData.editor.editMode === EditMode.Edit}
		<AddButton onclick={() => addBoard()} />
	{/if}

	{#each boards as board}
		<EditableButton
			onselect={() => {
				mainData.boardData.selectedBoard = board.name;
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
	}
</style>
