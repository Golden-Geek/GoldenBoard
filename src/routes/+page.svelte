<script lang="ts">
	import Toolbar from '$lib/components/Toolbar.svelte';
	import OscTreePanel from '$lib/components/OscTreePanel.svelte';
	import BoardCanvas from '$lib/components/BoardCanvas.svelte';
	import InspectorPanel from '$lib/components/InspectorPanel.svelte';
	import ModeToggle from '$lib/components/ModeToggle.svelte';
	import { editorMode, mainSettings, toggleEditorMode } from '$lib/stores/ui';
	import type { EditorMode } from '$lib/stores/ui';
	import {
		activeBoard,
		selectedWidget,
		removeWidgetFromBoard,
		undoBoardChange,
		redoBoardChange
	} from '$lib/stores/boards';
	import type { ContainerWidget, Widget } from '$lib/types/widgets';

	let boardCss = '';
	let globalCss = '';
	let selection: { widget: Widget; parent?: ContainerWidget } | null = null;
	$: mode = $editorMode;
	$: isLive = mode === 'live';
	$: showLiveBoards = $mainSettings.showLiveBoards;
	$: showEditLiveButtons = $mainSettings.showEditLiveButtons;
	$: canvasShowsHeader = !isLive || showLiveBoards;
	$: canvasShowsPanel = !isLive;
	$: globalCss = $mainSettings.globalCss;
	$: boardCss = $activeBoard?.css ?? '';
	$: selection = $selectedWidget;

	const isEditableTarget = (target: EventTarget | null): target is HTMLElement => {
		if (!(target instanceof HTMLElement)) return false;
		const tag = target.tagName;
		if (target.isContentEditable) return true;
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
	};

	const handleGlobalKeydown = (event: KeyboardEvent) => {

		if (event.key === 'e' && event.ctrlKey) {
			event.preventDefault();
			toggleEditorMode();
			return;
		}


		if (isLive) return;
		const targetIsEditable = isEditableTarget(event.target);
		const metaPressed = event.metaKey || event.ctrlKey;
		const key = event.key;
		const normalizedKey = key.toLowerCase();

		if (metaPressed && !targetIsEditable) {
			if (normalizedKey === 'z') {
				event.preventDefault();
				if (event.shiftKey) {
					redoBoardChange();
				} else {
					undoBoardChange();
				}
				return;
			}
			if (normalizedKey === 'y') {
				event.preventDefault();
				redoBoardChange();
				return;
			}
			
		}

		if (targetIsEditable) return;
		if (!selection || !$activeBoard) return;
		if (selection.widget.id === $activeBoard.root.id) return;
		if (!['Delete', 'Backspace'].includes(key)) return;
		event.preventDefault();
		removeWidgetFromBoard(selection.widget.id);

		
	};
</script>

<svelte:head>
	{#if globalCss.trim()}
		<style id="goldenboard-global-css">{globalCss}</style>
	{/if}
	{#if boardCss.trim()}
		<style id="goldenboard-board-css">{boardCss}</style>
	{/if}
</svelte:head>

<svelte:window on:keydown={handleGlobalKeydown} />

{#if mode !== 'loading'}
<div class={`app-root mode-${mode}`}>
	{#if !showEditLiveButtons}
	<ModeToggle />
	{/if}
	<div class={`toolbar-wrapper ${isLive ? 'toolbar-collapsed' : ''}`} aria-hidden={isLive}>
		<Toolbar  />
	</div>

	<div class={`workspace ${isLive ? 'workspace-live' : 'workspace-edit'}`}>
		<aside class={`panel-column panel-left ${isLive ? 'panel-collapsed' : ''}`} aria-hidden={isLive}>
			<OscTreePanel />
		</aside>
		<main class={`canvas-wrapper ${isLive ? 'live-only' : ''}`}>
			<BoardCanvas showHeader={canvasShowsHeader} showPanel={canvasShowsPanel} />
		</main>
		<aside class={`panel-column panel-right ${isLive ? 'panel-collapsed' : ''}`} aria-hidden={isLive}>
			<InspectorPanel />
		</aside>
	</div>
</div>
{/if}
