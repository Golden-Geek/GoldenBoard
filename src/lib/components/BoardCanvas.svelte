<script lang="ts">
	import WidgetRenderer from '$lib/components/WidgetRenderer.svelte';
	import {
		activeBoard,
		selectWidget,
		selectedWidget,
		boardsStore,
		selectBoard,
		addBoard,
		removeBoard
	} from '$lib/stores/boards';
	import { editorMode, mainSettings, updateMainSettings } from '$lib/stores/ui';
	import type { MainSettings, PreviewMode } from '$lib/stores/ui';
	import type { Board } from '$lib/types/board';

	let boards: Board[] = [];
	let activeBoardId = '';
	export let showHeader = true;
	export let showPanel = true;
	$: containerClass = showPanel ? 'panel canvas-panel' : 'canvas-panel bare';

	$: boards = $boardsStore.boards;
	$: activeBoardId = $boardsStore.activeBoardId ?? '';

	const handleSelectBoard = (id: string) => selectBoard(id);
	const createBoard = () => addBoard();

	type PreviewPreset = { id: string; label: string; width?: number; height?: number };

	const previewPresets: PreviewPreset[] = [
		{ id: 'responsive', label: 'Responsive (auto)' },
		{ id: 'desktop-1080', label: 'Desktop 1080p (1920x1080)', width: 1920, height: 1080 },
		{ id: 'laptop-1366', label: 'Laptop HD (1366x768)', width: 1366, height: 768 },
		{ id: 'tablet-landscape', label: 'Tablet Landscape (1280x800)', width: 1280, height: 800 },
		{ id: 'tablet-portrait', label: 'Tablet Portrait (834x1112)', width: 834, height: 1112 },
		{ id: 'phone-portrait', label: 'Phone Portrait (390x844)', width: 390, height: 844 },
		{ id: 'phone-landscape', label: 'Phone Landscape (844x390)', width: 844, height: 390 },
		{ id: 'square', label: 'Square (1024x1024)', width: 1024, height: 1024 },
		{ id: 'custom', label: 'Custom' }
	];

	const MIN_PREVIEW_DIMENSION = 240;
	const MAX_PREVIEW_DIMENSION = 4096;

	let previewMode: PreviewMode = 'responsive';
	let previewWidth = 1440;
	let previewHeight = 900;
	let previewPresetId = 'responsive';
	let selectedPreset = 'responsive';
	let isPreviewLocked = false;
	let previewStyle: string | undefined = undefined;

	$: previewMode = $mainSettings.previewMode ?? 'responsive';
	$: previewWidth = $mainSettings.previewWidth ?? 1440;
	$: previewHeight = $mainSettings.previewHeight ?? 900;
	$: previewPresetId = $mainSettings.previewPresetId ?? 'responsive';
	$: selectedPreset =
		previewMode === 'responsive'
			? 'responsive'
			: previewPresets.some((preset) => preset.id === previewPresetId)
				? previewPresetId
				: 'custom';
	$: isPreviewLocked = $editorMode === 'edit' && previewMode === 'fixed';
	$: previewStyle = isPreviewLocked
		? `--preview-width:${previewWidth}; --preview-height:${previewHeight}; --preview-width-px:${previewWidth}px; --preview-height-px:${previewHeight}px;`
		: undefined;

	const clampDimension = (value: number, fallback: number): number => {
		if (!Number.isFinite(value)) return fallback;
		return Math.min(MAX_PREVIEW_DIMENSION, Math.max(MIN_PREVIEW_DIMENSION, Math.round(value)));
	};

	const selectPreset = (presetId: string) => {
		if (presetId === 'responsive') {
			updateMainSettings({ previewMode: 'responsive', previewPresetId: 'responsive' });
			return;
		}
		const preset = previewPresets.find((item) => item.id === presetId);
		if (preset?.width && preset?.height) {
			updateMainSettings({
				previewMode: 'fixed',
				previewPresetId: presetId,
				previewWidth: preset.width,
				previewHeight: preset.height
			});
			return;
		}
		updateMainSettings({ previewMode: 'fixed', previewPresetId: 'custom' });
	};

	const handlePresetChange = (event: Event) => {
		const presetId = (event.target as HTMLSelectElement).value;
		selectPreset(presetId);
	};

	const handleDimensionChange = (dimension: 'width' | 'height', value: number) => {
		const current = dimension === 'width' ? previewWidth : previewHeight;
		const next = clampDimension(value, current);
		const patch: Partial<MainSettings> = {
			previewMode: 'fixed',
			previewPresetId: 'custom'
		};
		if (dimension === 'width') {
			patch.previewWidth = next;
		} else {
			patch.previewHeight = next;
		}
		updateMainSettings(patch);
	};

	const resetPreview = () => selectPreset('responsive');
</script>

<div class={containerClass}>
	{#if showHeader}
		<div class="board-switcher" role="tablist" aria-label="Boards">
			{#each boards as board}
				<div class="board-item">
					<button
						type="button"
						class:selected={board.id === activeBoardId}
						aria-pressed={board.id === activeBoardId}
						on:click={() => handleSelectBoard(board.id)}
						on:keydown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								handleSelectBoard(board.id);
							} else if (event.key === 'Delete' || event.key === 'Backspace') {
								event.preventDefault();
								if ($editorMode === 'edit') removeBoard(board.id);
							}
						}}
					>
						{board.name}
					</button>
					
				</div>
			{/each}
			
				{#if $editorMode === 'edit'}
					<button type="button" class="ghost add-board" on:click={createBoard} title="Add board"
						>➕</button
					>
				{/if}
		</div>
	{/if}
	{#if $editorMode === 'edit'}
		<div class="preview-controls" role="group" aria-label="Preview settings">
			<label class="preset-select">
				<span class="control-label">Preview</span>
				<select value={selectedPreset} on:change={handlePresetChange} aria-label="Preview preset">
					{#each previewPresets as preset}
						<option value={preset.id}>{preset.label}</option>
					{/each}
				</select>
			</label>
			{#if previewMode === 'fixed'}
				<div class="dimension-inputs">
					<label>
						<span class="control-label">W</span>
						<input
							type="number"
							inputmode="numeric"
							min={MIN_PREVIEW_DIMENSION}
							max={MAX_PREVIEW_DIMENSION}
							value={previewWidth}
							on:change={(event) =>
								handleDimensionChange('width', Number((event.target as HTMLInputElement).value))}
							aria-label="Preview width"
						/>
					</label>
					<span class="dimension-separator">x</span>
					<label>
						<span class="control-label">H</span>
						<input
							type="number"
							inputmode="numeric"
							min={MIN_PREVIEW_DIMENSION}
							max={MAX_PREVIEW_DIMENSION}
							value={previewHeight}
							on:change={(event) =>
								handleDimensionChange('height', Number((event.target as HTMLInputElement).value))}
							aria-label="Preview height"
						/>
					</label>
					<button type="button" class="ghost reset-preview" on:click={resetPreview}
						title="Reset to responsive layout">Reset</button
					>
				</div>
			{/if}
		</div>
	{/if}
	{#if $activeBoard}
		<div
			class={`board-canvas ${isPreviewLocked ? 'preview-locked' : ''}`}
			role="button"
			aria-label="Board canvas"
			tabindex="0"
			on:click={() => selectWidget($activeBoard.root.id)}
			on:keydown={(event) =>
				event.key === 'Enter' || event.key === ' '
					? (event.preventDefault(), selectWidget($activeBoard.root.id))
					: null}
		>
			<div class="preview-shell">
				<div class={`preview-stage ${isPreviewLocked ? 'is-fixed' : ''}`} style={previewStyle}>
					<div class="preview-content">
						<WidgetRenderer
							widget={$activeBoard.root}
							selectedId={$selectedWidget?.widget.id}
							rootId={$activeBoard.root.id}
						/>
					</div>
				</div>
				{#if isPreviewLocked}
					<div class="preview-meta" aria-live="polite">
						{previewWidth} x {previewHeight}
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<p class="muted">No board selected.</p>
	{/if}
</div>

<style>
	.canvas-panel.bare {
		background: transparent;
		border: none;
		box-shadow: none;
		padding: 0;
	}

	.board-switcher {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.6rem;
		flex-wrap: wrap;
	}

	.board-switcher button {
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

	.board-item {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.preview-controls {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.preview-controls select,
	.preview-controls input {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		color: inherit;
	}

	.preview-controls select {
		padding: 0.35rem 0.75rem;
		font-size: 0.82rem;
	}

	.dimension-inputs {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.dimension-inputs input {
		width: 92px;
		padding: 0.25rem 0.4rem;
		font-size: 0.8rem;
		text-align: center;
	}

	.control-label {
		display: block;
		font-size: 0.65rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--muted);
		margin-bottom: 0.15rem;
	}

	.dimension-separator {
		font-size: 0.8rem;
		opacity: 0.7;
	}

	.reset-preview {
		padding: 0.25rem 0.55rem;
		font-size: 0.75rem;
		letter-spacing: 0.05em;
	}

	.preview-shell {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}

	.preview-stage {
		width: 100%;
		min-height: 360px;
		border-radius: 18px;
		border: 1px dashed rgba(255, 255, 255, 0.1);
		background: rgba(7, 10, 18, 0.7);
		overflow: hidden;
		transition: width 140ms ease, height 140ms ease;
	}

	.preview-stage.is-fixed {
		width: min(100%, var(--preview-width-px, 1280px));
		max-width: var(--preview-width-px, 1280px);
		aspect-ratio: var(--preview-width, 16) / var(--preview-height, 9);
		max-height: min(100%, var(--preview-height-px, 800px));
		margin-inline: auto;
	}

	.preview-content {
		width: 100%;
		height: 100%;
		padding: 1rem;
		overflow: auto;
		box-sizing: border-box;
	}

	.preview-meta {
		padding: 0.2rem 0.8rem;
		font-size: 0.7rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--muted);
		background: rgba(2, 4, 8, 0.8);
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.06);
	}
</style>
