<script lang="ts">
	import { editorMode, setEditorMode } from '$lib/stores/ui';
	const modes = [
		{ id: 'edit', label: 'EDIT' },
		{ id: 'live', label: 'LIVE' }
	] as const;
</script>

<div class={`mode-toggle-floating ${$editorMode === 'live' ? 'mode-live' : ''}`}>
	{#each modes as mode}
		<button
			type="button"
			class:selected={$editorMode === mode.id}
			on:click={() => setEditorMode(mode.id)}
		>
			{mode.label}
		</button>
	{/each}
</div>

<style>
	.mode-toggle-floating {
		position: fixed;
		top: 0.75rem;
		right: 0.75rem;
		display: inline-flex;
		gap: 0.4rem;
		padding: 0.25rem 0.35rem;
		border-radius: 999px;
		background: rgba(8, 9, 15, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.08);
		z-index: 50;
		transition: opacity 160ms ease;
	}

	.mode-toggle-floating.mode-live {
		opacity: 0.4;
	}

	.mode-toggle-floating.mode-live:hover {
		opacity: 1;
	}

	.mode-toggle-floating button {
		border: none;
		background: transparent;
		color: var(--muted);
		font-size: 0.74rem;
		letter-spacing: 0.18em;
		padding: 0.2rem 0.65rem;
		border-radius: 999px;
		cursor: pointer;
		transition: background 120ms ease, color 120ms ease;
	}

	.mode-toggle-floating button.selected {
		background: var(--accent);
		color: #0b0803;
	}
</style>
