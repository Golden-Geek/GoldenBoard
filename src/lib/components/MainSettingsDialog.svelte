<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { mainSettings, updateMainSettings } from '$lib/stores/ui';

	export let open = false;
	const dispatch = createEventDispatcher();

	const close = () => {
		open = false;
		dispatch('close');
	};

	const handleBackdrop = (event: MouseEvent) => {
		if (event.target === event.currentTarget) {
			close();
		}
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			event.stopPropagation();
			close();
		}
	};

	const toggleLiveBoards = (event: Event) => {
		const checked = (event.target as HTMLInputElement).checked;
		updateMainSettings({ showLiveBoards: checked });
	};

	const handleGlobalCss = (event: Event) => {
		const next = (event.target as HTMLTextAreaElement).value;
		updateMainSettings({ globalCss: next });
	};
</script>

{#if open}
	<div class="settings-overlay" role="dialog" aria-modal="true" aria-label="Main settings" on:click={handleBackdrop} on:keydown={handleKeydown} tabindex="-1">
		<div class="settings-panel">
			<header class="settings-header">
				<div>
					<p class="eyebrow">Main Settings</p>
					<h2>Experience</h2>
				</div>
				<button type="button" class="close" aria-label="Close settings" on:click={close}>✕</button>
			</header>
			<section class="settings-group">
				<label class="setting-row">
					<div>
						<strong>Show boards list in live mode</strong>
						<p class="hint">Toggle the board switcher visibility while presenting.</p>
					</div>
					<div class="toggle">
						<input id="show-live-boards" type="checkbox" checked={$mainSettings.showLiveBoards} on:change={toggleLiveBoards} />
					</div>
				</label>
			</section>
			<section class="settings-group">
				<div class="setting-row stacked">
					<div>
						<strong>Global CSS</strong>
						<p class="hint">Applied across every board and workspace view.</p>
					</div>
					<textarea rows={6} value={$mainSettings.globalCss} on:input={handleGlobalCss} placeholder={':root { }'}></textarea>
				</div>
			</section>
		</div>
	</div>
{/if}

<style>
	.settings-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(4, 6, 10, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 80;
		backdrop-filter: blur(6px);
	}

	.settings-panel {
		background: rgba(12, 15, 24, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 14px;
		padding: 1.25rem 1.5rem;
		width: min(420px, 90vw);
		box-shadow: 0 25px 85px rgba(3, 5, 10, 0.6);
		color: var(--text);
	}

	.settings-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.settings-header h2 {
		margin: 0;
		font-size: 1.1rem;
	}

	.eyebrow {
		margin: 0;
		font-size: 0.72rem;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.close {
		width: 32px;
		height: 32px;
		border-radius: 999px;
		font-size: 0.9rem;
	}

	.settings-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 0;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	.setting-row.stacked {
		flex-direction: column;
		align-items: stretch;
	}

	.setting-row textarea {
		width: 100%;
		min-height: 140px;
		resize: vertical;
	}

	.setting-row strong {
		font-size: 0.92rem;
	}

	.setting-row .hint {
		margin: 0.1rem 0 0;
		font-size: 0.75rem;
		color: var(--muted);
	}

	.toggle input[type='checkbox'] {
		width: 42px;
		height: 24px;
		accent-color: var(--accent);
	}
</style>
