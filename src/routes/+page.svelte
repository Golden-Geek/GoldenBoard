<script lang="ts">
	import BoardPanel from '$lib/board/BoardPanel.svelte';
	import InspectorPanel from '$lib/inspector/InspectorPanel.svelte';
	import OutlinerPanel from '$lib/widget/OutlinerPanel.svelte';
	import ServerPanel from '$lib/servers/ServerPanel.svelte';
	import TopBar from '$lib/editor/TopBar.svelte';
	import Split from 'split-grid';
	import { onMount, tick } from 'svelte';
	import { EditMode, mainState, redo, saveData, undo } from '$lib/engine/engine.svelte';
	import { fly } from 'svelte/transition';
	import Panel from '$lib/editor/Panel.svelte';
	import Footer from '$lib/editor/Footer.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import { selectedWidgets, selectWidgets } from '$lib/widget/widgets.svelte';

	let editorState: any = $derived(mainState.editor);
	let editorLayout: any = $derived(editorState?.layout);
	let editMode = $derived(editorState?.editMode);

	$inspect(editorLayout, editMode);

	let contentDiv = $state<HTMLDivElement | null>(null);
	let leftSplitter = $state<HTMLDivElement | null>(null);
	let rightSplitter = $state<HTMLDivElement | null>(null);
	let leftPaneSplitter = $state<HTMLDivElement | null>(null);

	let layoutLoaded = $state(false);

	$effect(() => {
		loadLayout();
	});

	$effect(() => {
		if (!editMode) return;
		tick().then(() => {
			initSplitter();
		});
	});

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		window.addEventListener('fullscreenchange', () => {
			mainState.editor.fullScreen = document.fullscreenElement != null;
			saveData('Toggle Fullscreen', {
				skipHistory: true
			});
		});

		let fullScreenOnLoad = mainState.globalSettings.fullScreenOnLoad;

		let doFullScreen =
			fullScreenOnLoad == 'on' || (mainState.editor.fullScreen && fullScreenOnLoad == 'last');

		if (doFullScreen) {
			// Only request fullscreen if already in fullscreen due to user gesture
			if (!document.fullscreenElement) {
				console.warn('Fullscreen request skipped: must be triggered by user gesture.');
			}
			document.documentElement.requestFullscreen();
			mainState.editor.fullScreen = true;
		} else {
			if (document.fullscreenElement) document.exitFullscreen();
			mainState.editor.fullScreen = false;
		}

		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});

	function initSplitter() {
		if (!leftSplitter || !rightSplitter || !leftPaneSplitter || !contentDiv) return;
		console.log('Initializing splitters');
		tick().then(() => {
			Split({
				columnGutters: [
					{
						track: 1,
						element: leftSplitter!
					},
					{
						track: 3,
						element: rightSplitter!
					}
				],
				rowGutters: [
					{
						track: 1,
						element: leftPaneSplitter!
					}
				],
				columnMinSize: 150,
				onDragEnd: () => {
					saveLayout();
				}
			});

			loadLayout();
		});
	}

	function loadLayout() {
		console.log('Loading layout', editorLayout);
		if (contentDiv == null) return;
		if (editorLayout) {
			const { inspectorWidth, leftPaneWidth, outlinerHeight } = editorLayout as {
				inspectorWidth: string;
				leftPaneWidth: string;
				outlinerHeight: string;
			};
			if (contentDiv) {
				contentDiv.style.gridTemplateColumns = `${leftPaneWidth} 8px 1fr 8px ${inspectorWidth}`;
				contentDiv.style.gridTemplateRows = `${outlinerHeight} 8px 1fr`;
			}
		} else {
			// Set defaults
			if (contentDiv) {
				contentDiv.style.gridTemplateColumns = `250px 8px 1fr 8px 300px`;
				contentDiv.style.gridTemplateRows = `1fr 8px 1fr`;
			}
		}
		console.log('Layout loaded:', layoutLoaded);
		layoutLoaded = true;
	}

	function saveLayout() {
		if (!contentDiv) return;

		// Get computed grid sizes
		const style = getComputedStyle(contentDiv);
		const columns = style.gridTemplateColumns.split(' ').map((s) => s.trim());
		const rows = style.gridTemplateRows.split(' ').map((s) => s.trim());

		// Inspector width: last column
		const inspectorWidth = columns[columns.length - 1];
		// Left pane width: first column
		const leftPaneWidth = columns[0];
		// Outliner height: first row
		const outlinerHeight = rows[0];

		editorLayout = {
			inspectorWidth,
			leftPaneWidth,
			outlinerHeight
		};

		saveData('Change Layout');
	}

	function handleKeydown(event: KeyboardEvent) {
		const mod = event.ctrlKey || event.metaKey;
		if (mod && (event.key === 'z' || event.key === 'Z')) {
			event.preventDefault();
			if (event.shiftKey) redo();
			else undo();
			return;
		}
		if (event.ctrlKey && (event.key === 'y' || event.key === 'Y')) {
			event.preventDefault();
			redo();
			return;
		}
		if (event.ctrlKey && (event.key === 'e' || event.key === 'E')) {
			event.preventDefault();
			mainState.editor.editMode = editMode === EditMode.Edit ? EditMode.Live : EditMode.Edit;
			saveData('Toggle Edit Mode', { skipHistory: true });
		}
		if (event.key === 'Delete' || event.key === 'Backspace') {
			//should not be active when focused on input or textarea
			const activeElement = document.activeElement;
			if (
				activeElement &&
				(activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')
			) {
				return;
			}

			if (selectedWidgets.length > 0) {
				event.preventDefault();
				let widgetsToDelete = [...selectedWidgets];
				widgetsToDelete.forEach((w) => w.remove(false));
				saveData('Delete Selected Widgets');
			}
		}
		if (event.key == 'F11') {
			event.preventDefault();
			if (!document.fullscreenElement) {
				document.documentElement.requestFullscreen();
			} else {
				document.exitFullscreen();
			}
			console.log('Toggling fullscreen from F11', mainState.editor.fullScreen);
			saveData('Toggle Fullscreen', {
				skipHistory: true
			});
		}
		if (event.key == 's' && mod) {
			event.preventDefault();
			saveData('Save', { skipHistory: true });
		}
		if (event.key == 'd' && mod) {
			event.preventDefault();
			let snapSelection = [...selectedWidgets];
			let newWidgets: any[] = [];
			snapSelection.forEach((w) => {
				let newW = w.duplicate({ save: false, select: false });
				if (newW) newWidgets.push(newW);
			});

			selectWidgets(newWidgets, true, false);

			saveData('Duplicate Selected Widgets');
		}
	}
</script>

<div class="root mode-{editMode}">
	{#if editMode == EditMode.Edit}
		<div class="topbar-area" transition:fly={{ y: -50 }}>
			<TopBar />
		</div>
	{/if}

	<div class="content {layoutLoaded ? '' : 'loading'}" bind:this={contentDiv}>
		{#if editMode == EditMode.Edit}
			<div class="outliner-area">
				<Panel name="Outliner">
					<OutlinerPanel />
				</Panel>
			</div>

			<div class="server-area">
				<Panel name="Servers">
					<ServerPanel />
				</Panel>
			</div>
		{/if}

		<div class="board-area">
			<Panel name="Board">
				<BoardPanel />
			</Panel>
		</div>

		{#if editMode == EditMode.Edit}
			<div class="inspector-area">
				<Panel name="Inspector">
					<InspectorPanel />
				</Panel>
			</div>

			<div class="left-splitter" bind:this={leftSplitter}></div>
			<div class="right-splitter" bind:this={rightSplitter}></div>
			<div class="leftpane-splitter" bind:this={leftPaneSplitter}></div>
		{/if}
	</div>

	{#if editMode}
		<div class="footer-area" transition:fly={{ y: 50 }}>
			<Footer />
		</div>
	{/if}
</div>

<ContextMenu />

<style>
	.root {
		height: 100%;
		display: flex;
		flex-direction: column;
		transition: gap 0.3s ease;
	}

	.root.mode-live {
		--panel-bg: #ffffff;
		--border-color: #cccccc;
		gap: 0;
	}

	.topbar-area,
	.footer-area {
		width: 100%;
		transition: height 0.3s ease;
	}

	.mode-live .topbar-area,
	.mode-live .footer-area {
		height: 0;
	}

	.content {
		width: 100%;
		height: 100%;
		opacity: 1;
		padding: 0.5rem;
		transition:
			opacity 0.2s ease,
			padding 0.3s ease;
		overflow: hidden;
	}

	.content.loading {
		opacity: 0;
	}

	.mode-edit .content {
		flex: 1 1 auto;
		display: grid;
		grid-template-areas:
			'outliner       left-split content right-split inspector'
			'leftpane-split left-split content right-split inspector'
			'server         left-split content right-split inspector';

		grid-template-rows: 1fr 8px 1fr;
		grid-template-columns: 250px 8px 1fr 8px 300px;
		width: 100%;
		height: 100%;
	}

	.mode-live .content {
		width: 100%;
		height: 100%;
		padding: 0;
	}

	.outliner-area {
		grid-area: outliner;
		min-width: 150px;
		min-height: 100px;
	}

	.server-area {
		grid-area: server;
		min-width: 150px;
		min-height: 100px;
	}

	.inspector-area {
		grid-area: inspector;
		min-width: 150px;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.mode-edit .board-area {
		grid-area: content;
		min-width: 0;
	}

	.mode-live .board-area {
		width: 100%;
		height: 100%;
		min-width: 0;
	}

	.left-splitter {
		grid-area: left-split;
		cursor: col-resize;
		width: 8px;
	}

	.right-splitter {
		grid-area: right-split;
		cursor: col-resize;
		width: 8px;
	}

	.leftpane-splitter {
		grid-area: leftpane-split;
		cursor: row-resize;
		height: 8px;
	}
</style>
