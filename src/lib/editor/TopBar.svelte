<script lang="ts">
	import { EditMode, clearData, mainState, saveData } from '$lib/engine/engine.svelte';
	import WidgetBar from '$lib/widget/WidgetBar.svelte';
</script>

<div class="topbar">
	<p class="title">Golden Board v{PKG.version}</p>

	<div class="spacer"></div>
	<WidgetBar></WidgetBar>

	<div class="spacer"></div>
	<div class="fullscreen-switch">
		<button
			onclick={() => {
				if (!document.fullscreenElement) {
					document.documentElement.requestFullscreen();
					mainState.editor.fullScreen = true;
				} else {
					document.exitFullscreen();
					mainState.editor.fullScreen = false;
				}
				saveData('Toggle Fullscreen', {
					skipHistory: true
				});
			}}
		>
			{#if mainState.editor.fullScreen}
				Exit Fullscreen
			{:else}
				Enter Fullscreen
			{/if}
		</button>
	</div>
	<div class="mode-switch">
		<button
			onclick={() => {
				mainState.editor.editMode = EditMode.Live;
			}}
		>
			Switch to Live
		</button>

		<button onclick={() => saveData('Save', { skipHistory: true })}> Save </button>
		<button onclick={() => clearData()}> Clear </button>
	</div>
</div>

<style>
	.topbar {
		height: 3rem;
		display: flex;
		align-items: center;
		padding: 0 10px;
		box-sizing: border-box;
		background-color: var(--panel-bg-color);
		color: rgba(from var(--text-color) r g b / 30%);
		font-weight: bold;
		text-transform: uppercase;
		box-shadow: 1px 1px 5px rgba(0, 0, 0, 1);
	}

	.spacer {
		flex-grow: 1;
	}
</style>
