<script lang="ts">
	import AddButton from '$lib/components/AddButton.svelte';
	import EditableButton from '$lib/components/EditableButton.svelte';
	import BoardView from './BoardView.svelte';
	import { addBoard, Board, removeBoard } from './boards.svelte';
	import { mainState, saveData, EditMode, MenuContextType } from '$lib/engine/engine.svelte';
	import { Menu } from '../inspector/inspector.svelte.ts';
	import { ColorUtil } from '../property/Color.svelte';
	import type { Property } from '$lib/property/property.svelte';

	let selectedBoard = $derived(mainState.selectedBoard);
	let boards = $derived(mainState.boards);
	let editMode = $derived(mainState.editor?.editMode == EditMode.Edit);

	let showList = $derived(
		(mainState.globalSettings.showBoardsListInLiveMode &&
			!(mainState.globalSettings.hideListIfOnlyOneBoard && boards.length === 1)) ||
			editMode
	);
</script>

{#if showList}
	<div class="board-list">
		{#if editMode}
			<AddButton onclick={() => addBoard()} />
		{/if}

		{#each boards as board}
			<EditableButton
				onSelect={() => {
					if (selectedBoard != board || mainState.editor.inspectorMenu != Menu.Board) {
						mainState.selectedBoard = board;
						mainState.editor.inspectorMenu = Menu.Board;
						saveData('Select Board', { coalesceID: 'select-board' });
					}
				}}
				editable={true}
				value={board.showDescription && board.descriptionPlacement == 'button'
					? board.name + '\n' + board.description
					: board.name}
				separator={'\n'}
				onChange={(newValue: string) => {
					(board.getProp('name') as Property | null)?.setRaw(newValue);
					saveData('Rename Board', { coalesceID: 'rename-board-' + board.id });
				}}
				hasRemoveButton={editMode && boards.length > 1}
				selected={board.isSelected}
				icon={board.icon as string}
				onRemove={() => {
					removeBoard(board);
				}}
				color={ColorUtil.toHex(board.color)}
			></EditableButton>
		{/each}

		<div class="spacer"></div>
		<div class="board-description">
			{#if selectedBoard != null && selectedBoard!.showDescription && selectedBoard!.descriptionPlacement == 'bar'}
				{selectedBoard!.description}
			{/if}
		</div>
		<div class="spacer"></div>
	</div>
{/if}

{#if selectedBoard != null}
	<BoardView board={selectedBoard} />
{/if}

<style>
	.board-list {
		display: flex;
		gap: 0.5rem;
	}

	.spacer {
		flex-grow: 1;
	}

	.board-description {
		align-self: center;
		text-align: center;
		font-style: italic;
		color: var(--text-secondary-color);
	}
</style>
