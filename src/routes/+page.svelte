<script lang="ts">
	import BoardPanel from '$lib/editor/BoardPanel.svelte';
	import InspectorPanel from '$lib/editor/InspectorPanel.svelte';
	import OutlinerPanel from '$lib/editor/OutlinerPanel.svelte';
	import ServerPanel from '$lib/editor/ServerPanel.svelte';
	import TopBar from '$lib/editor/TopBar.svelte';
	import Split from 'split-grid';
	import { onMount, tick } from 'svelte';
	import { EditMode, mainData, loadData, redo, saveData, undo } from '$lib/engine.svelte';
	import { fly } from 'svelte/transition';
	import Panel from '$lib/editor/Panel.svelte';
	import Footer from '$lib/editor/Footer.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';

	let editorState: any = $derived(mainData.editor);
	let editMode = $derived(editorState.editMode == EditMode.Edit);

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

		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});

	function initSplitter() {
		if (!leftSplitter || !rightSplitter || !leftPaneSplitter || !contentDiv) return;
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
				onDragEnd: () => {
					saveLayout();
				}
			});

			loadLayout();
		});
	}

	function loadLayout() {
		if (contentDiv == null) return;
		if (editorState.layout) {
			const { inspectorWidth, leftPaneWidth, outlinerHeight } = editorState.layout as {
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

		editorState.layout = {
			inspectorWidth,
			leftPaneWidth,
			outlinerHeight
		};

		saveData('Save Layout');
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
			editorState.editMode = editorState.editMode === EditMode.Live ? EditMode.Edit : EditMode.Live;
			saveData('Toggle Edit Mode', { skipHistory: true });
		}
	}
</script>

<div class="root mode-{editorState.editMode}">
	{#if editMode}
		<div class="topbar-area" transition:fly={{ y: -50 }}>
			<TopBar />
		</div>
	{/if}

	<div class="content {layoutLoaded ? '' : 'loading'}" bind:this={contentDiv}>
		{#if editMode}
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

		{#if editMode}
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
		overflow: auto;
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
		min-width: 0;
	}

	.mode-live .content {
		width: 100%;
		height: 100%;
		padding: 0;
	}

	.outliner-area {
		grid-area: outliner;
		min-width: 100px;
		min-height: 100px;
	}

	.server-area {
		grid-area: server;
		min-width: 100px;
		min-height: 100px;
	}

	.inspector-area {
		grid-area: inspector;
		min-width: 100px;
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
