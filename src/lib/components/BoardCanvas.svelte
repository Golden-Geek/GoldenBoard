<script lang="ts">
	import WidgetRenderer from '$lib/components/WidgetRenderer.svelte';
	import { activeBoard, selectWidget, selectedWidget, boardsStore, selectBoard, addBoard } from '$lib/stores/boards';
	import type { Board } from '$lib/types/board';

	let boards: Board[] = [];
	let activeBoardId = '';

	$: boards = $boardsStore.boards;
	$: activeBoardId = $boardsStore.activeBoardId ?? '';

	const handleSelectBoard = (id: string) => selectBoard(id);
	const createBoard = () => addBoard();
</script>

<div class="panel canvas-panel">
	<div class="board-switcher" role="tablist" aria-label="Boards">
		{#each boards as board}
			<button
				type="button"
				class:selected={board.id === activeBoardId}
				aria-pressed={board.id === activeBoardId}
				on:click={() => handleSelectBoard(board.id)}
			>
				{board.name}
			</button>
		{/each}
		<button type="button" class="ghost add-board" on:click={createBoard} title="Add board">+</button>
	</div>
	{#if $activeBoard}
		<div
			class="board-canvas"
			role="button"
			aria-label="Board canvas"
			tabindex="0"
			on:click={() => selectWidget($activeBoard.root.id)}
			on:keydown={(event) =>
				(event.key === 'Enter' || event.key === ' ')
					? (event.preventDefault(), selectWidget($activeBoard.root.id))
					: null}
		>
			<WidgetRenderer widget={$activeBoard.root} selectedId={$selectedWidget?.widget.id} rootId={$activeBoard.root.id} />
		</div>
	{:else}
		<p class="muted">No board selected.</p>
	{/if}
</div>

<style>
	.board-switcher {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.6rem;
		flex-wrap: wrap;
	}

	.board-switcher button {
		padding: 0.15rem 0.75rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.04);
		font-size: 0.78rem;
	}

	.board-switcher button.selected {
		background: var(--accent);
		color: #0b0702;
	}

	.add-board {
		width: 28px;
		height: 28px;
		padding: 0;
		font-size: 1rem;
	}
</style>
