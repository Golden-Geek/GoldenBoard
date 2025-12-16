<script lang="ts">
	import BoardPanel from '$lib/editor/BoardPanel.svelte';
	import InspectorPanel from '$lib/editor/InspectorPanel.svelte';
	import OutlinerPanel from '$lib/editor/OutlinerPanel.svelte';
	import ServerPanel from '$lib/editor/ServerPanel.svelte';
	import TopBar from '$lib/editor/TopBar.svelte';
	import Split from 'split-grid';
	import { onMount, tick } from 'svelte';
	import { editMode, EditMode } from '$lib/editor/editor.ts';
	import { fade, fly } from 'svelte/transition';

	let leftSplitter: HTMLDivElement | null = null;
	let rightSplitter: HTMLDivElement | null = null;
	let leftPaneSplitter: HTMLDivElement | null = null;

	let layoutLoaded = false;

	$: {
		if ($editMode === EditMode.Edit) {
			// Wait for DOM update
			tick().then(() => {
				// Re-initialize splitter to ensure gutters are active
				initSplitter();
			});
		}
	}

	onMount(() => {
		initSplitter();

		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});

	function initSplitter() {
		if (!leftSplitter || !rightSplitter || !leftPaneSplitter) return;
		loadLayout();
		tick().then(() => {
			Split({
				columnGutters: [
					{
						track: 1,
						element: leftSplitter
					},
					{
						track: 3,
						element: rightSplitter
					}
				],
				rowGutters: [
					{
						track: 1,
						element: leftPaneSplitter
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
		layoutLoaded = true;
		const savedLayout = localStorage.getItem('layout');
		if (savedLayout) {
			const { inspectorWidth, leftPaneWidth, outlinerHeight } = JSON.parse(savedLayout);
			const content = document.querySelector('.content') as HTMLElement;
			if (content) {
				content.style.gridTemplateColumns = `${leftPaneWidth} 8px 1fr 8px ${inspectorWidth}`;
				content.style.gridTemplateRows = `${outlinerHeight} 8px 1fr`;
			}
		}
	}

	function saveLayout() {
		const content = document.querySelector('.content') as HTMLElement;
		if (!content) return;

		// Get computed grid sizes
		const style = getComputedStyle(content);
		const columns = style.gridTemplateColumns.split(' ').map((s) => s.trim());
		const rows = style.gridTemplateRows.split(' ').map((s) => s.trim());

		// Inspector width: last column
		const inspectorWidth = columns[columns.length - 1];
		// Left pane width: first column
		const leftPaneWidth = columns[0];
		// Outliner height: first row
		const outlinerHeight = rows[0];

		// Save to localStorage (or any storage you prefer)
		localStorage.setItem(
			'layout',
			JSON.stringify({
				inspectorWidth,
				leftPaneWidth,
				outlinerHeight
			})
		);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.ctrlKey && (event.key === 'e' || event.key === 'E')) {
			event.preventDefault();
			$editMode = $editMode === EditMode.Live ? EditMode.Edit : EditMode.Live;
		}
	}
</script>

<div class="root mode-{$editMode}">
	{#if $editMode === EditMode.Edit}
		<TopBar />
	{/if}

	<div class="content {layoutLoaded ? '' : 'loading'}">
		{#if $editMode === EditMode.Edit}
			<div class="outliner-area">
				<OutlinerPanel />
			</div>

			<div class="server-area">
				<ServerPanel />
			</div>
		{/if}

		<div class="board-area">
			<BoardPanel />
		</div>

		{#if $editMode === EditMode.Edit}
			<div class="inspector-area">
				<InspectorPanel />
			</div>

			<div class="left-splitter" bind:this={leftSplitter}></div>
			<div class="right-splitter" bind:this={rightSplitter}></div>
			<div class="leftpane-splitter" bind:this={leftPaneSplitter}></div>
		{/if}
	</div>
</div>

<style>
	.root {
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;
		transition: padding 0.3s ease;
	}

	.root.mode-live {
		padding: 0;
	}

	.root.mode-live {
		--panel-bg: #ffffff;
		--border-color: #cccccc;
	}

	.content {
		width: 100%;
		height: 100%;
		opacity: 1;
		transition: opacity 0.2s ease;
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

	.board-area {
		/* transition:
			width 1s ease,
			height 1s ease; */
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
