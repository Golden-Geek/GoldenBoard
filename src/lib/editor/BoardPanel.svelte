<script lang="ts">
	import AddButton from '$lib/components/AddButton.svelte';
	import EditableButton from '$lib/components/EditableButton.svelte';
	import Board from '$lib/board/Board.svelte';
	import { addBoard, removeBoard, type BoardData } from '$lib/board/boards.svelte';
	import { mainData, saveData, EditMode } from '$lib/engine.svelte';
	import { color } from 'storybook/theming';

	let selectedBoardID: BoardData | null = $derived(
		mainData.boardData.selectedBoardID
			? mainData.boardData.boards.find((b) => b.id === mainData.boardData.selectedBoardID) || null
			: null
	);

	let boards = $derived(mainData.boardData.boards);
	let board: BoardData = $derived(boards.find((b) => b.id === mainData.boardData.selectedBoardID)!);

	$effect(() => {
		if (boards.length === 0) {
			addBoard();
		}

		if (selectedBoardID == null && boards.length > 0) {
			mainData.boardData.selectedBoardID = boards[0].id;
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
				if (selectedBoardID == board) return;
				mainData.boardData.selectedBoardID = board.id;
				saveData('Select Board');
			}}
			editable={true}
			bind:value={board.name}
			hasRemoveButton={boards.length > 1}
			selected={selectedBoardID == board}
			onremove={() => { removeBoard(board); }}
			color={'var(--board-color)'}
		></EditableButton>
	{/each}
</div>

<Board {board} />

<style>
	.board-list {
		display: flex;
		gap: 0.5rem;
	}
</style>
