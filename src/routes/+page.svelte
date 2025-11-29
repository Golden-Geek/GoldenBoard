<script lang="ts">
	import Toolbar from '$lib/components/Toolbar.svelte';
	import OscTreePanel from '$lib/components/OscTreePanel.svelte';
	import BoardCanvas from '$lib/components/BoardCanvas.svelte';
	import InspectorPanel from '$lib/components/InspectorPanel.svelte';
	import ModeToggle from '$lib/components/ModeToggle.svelte';
	import MainSettingsDialog from '$lib/components/MainSettingsDialog.svelte';
	import { editorMode, mainSettings } from '$lib/stores/ui';
	import type { EditorMode } from '$lib/stores/ui';
	import { activeBoard } from '$lib/stores/boards';

	let mode: EditorMode = 'edit';
	let settingsOpen = false;
	let boardCss = '';
	let globalCss = '';
	$: mode = $editorMode;
	$: isLive = mode === 'live';
	$: showLiveBoards = $mainSettings.showLiveBoards;
	$: globalCss = $mainSettings.globalCss;
	$: boardCss = $activeBoard?.css ?? '';
</script>

<svelte:head>
	{#if globalCss.trim()}
		<style id="goldenboard-global-css">{globalCss}</style>
	{/if}
	{#if boardCss.trim()}
		<style id="goldenboard-board-css">{boardCss}</style>
	{/if}
</svelte:head>

<div class={`app-root mode-${mode}`}>
	<ModeToggle />
	{#if !isLive}
		<Toolbar on:openSettings={() => (settingsOpen = true)} />
	{/if}

	<div class={`workspace ${isLive ? 'workspace-live' : 'workspace-edit'}`}>
		{#if isLive}
			<main class="canvas-wrapper live-only">
				<BoardCanvas showHeader={showLiveBoards} showPanel={false} />
			</main>
		{:else}
			<aside class="panel-column">
				<OscTreePanel />
			</aside>
			<main class="canvas-wrapper">
				<BoardCanvas />
			</main>
			<aside class="panel-column">
				<InspectorPanel />
			</aside>
		{/if}
	</div>
	<MainSettingsDialog bind:open={settingsOpen} />
</div>
