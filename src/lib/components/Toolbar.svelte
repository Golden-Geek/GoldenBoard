<script lang="ts">
	import { addBoard, boardsStore, exportActiveBoard, importBoard, selectBoard } from '$lib/stores/boards';
	import { connectOsc, oscEndpoint, oscStatus } from '$lib/stores/oscquery';

	let fileInput: HTMLInputElement;
	let endpoint = '';
	$: endpoint = $oscEndpoint;
	let selectedBoardId = '';
	$: selectedBoardId = $boardsStore.activeBoardId;

	const uploadBoard = () => fileInput.click();

	const handleImport = async (event: Event) => {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const text = await file.text();
		importBoard(text);
		input.value = '';
	};

	const handleExport = () => {
		const data = exportActiveBoard();
		const blob = new Blob([data], { type: 'application/json' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = 'golden-board.json';
		link.click();
		URL.revokeObjectURL(link.href);
	};

	const handleConnect = () => {
		oscEndpoint.set(endpoint);
		connectOsc(endpoint);
	};

	const handleBoardChange = (event: Event) => {
		const value = (event.target as HTMLSelectElement).value;
		selectedBoardId = value;
		selectBoard(value);
	};

	const handleEndpointInput = (event: Event) => {
		endpoint = (event.target as HTMLInputElement).value;
		oscEndpoint.set(endpoint);
	};
</script>

<div class="toolbar">
	<div class="board-controls">
		<label>
			<span class="section-title">Boards</span>
			<select value={selectedBoardId} on:change={handleBoardChange}>
				{#each $boardsStore.boards as board}
					<option value={board.id}>{board.name}</option>
				{/each}
			</select>
		</label>
		<button class="primary" on:click={() => addBoard()}>+ Board</button>
	</div>

	<div class="toolbar-actions">
		<button on:click={uploadBoard}>Import JSON</button>
		<button on:click={handleExport}>Export JSON</button>
		<button class="ghost" on:click={handleConnect}>Connect OSC</button>
		<input
			value={endpoint}
			type="text"
			placeholder="http://localhost:53000"
			aria-label="OSC Endpoint"
			on:input={handleEndpointInput}
		/>
		<span class={`status ${$oscStatus}`}>{$oscStatus}</span>
	</div>
	<input bind:this={fileInput} type="file" accept="application/json" hidden on:change={handleImport} />
</div>

<style>
	.board-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.toolbar-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status {
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		text-transform: capitalize;
		font-size: 0.8rem;
	}

	.status.connected {
		background: rgba(104, 217, 164, 0.2);
		color: #79f7c1;
	}

	.status.error {
		background: rgba(255, 107, 107, 0.15);
		color: var(--danger);
	}
</style>
