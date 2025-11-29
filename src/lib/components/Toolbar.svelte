<script lang="ts">
	import WidgetToolbar from '$lib/components/WidgetToolbar.svelte';
	import { exportActiveBoard, importBoard } from '$lib/stores/boards';

	let fileInput: HTMLInputElement;

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

</script>

<div class="toolbar-shell">
	<div class="meta-toolbar single-line">
		<div class="brand" aria-label="Golden Board">
			<span>Golden Board</span>
		</div>
		<WidgetToolbar iconOnly />
		<div class="actions">
			<button on:click={uploadBoard} type="button" title="Import board">Import</button>
			<button on:click={handleExport} type="button" title="Export board">Export</button>
		</div>
	</div>
	<input bind:this={fileInput} type="file" accept="application/json" hidden on:change={handleImport} />
</div>

<style>
	.toolbar-shell {
		background: rgba(5, 7, 12, 0.92);
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
	}

	.meta-toolbar.single-line {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.35rem 1rem;
	}

	.brand {
		font-size: 0.7rem;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.actions {
		display: flex;
		gap: 0.3rem;
		margin-left: auto;
	}

	.actions button {
		padding: 0.25rem 0.65rem;
		font-size: 0.75rem;
		letter-spacing: 0.08em;
	}
</style>
