<script>
	import BoardPanel from '$lib/editor/BoardPanel.svelte';
	import InspectorPanel from '$lib/editor/InspectorPanel.svelte';
	import OutlinerPanel from '$lib/editor/OutlinerPanel.svelte';
	import ServerPanel from '$lib/editor/ServerPanel.svelte';
	import TopBar from '$lib/editor/TopBar.svelte';
	import Split from 'split-grid';
	import { onMount, tick } from 'svelte';

	let leftSplitter, rightSplitter, leftPaneSplitter;

	onMount(async () => {
		await tick();
		if (!leftSplitter || !rightSplitter || !leftPaneSplitter) return;

		Split({
			columnGutters: [
				{
					track: 1,
					element: leftSplitter,
				},
				{
					track: 3,
					element: rightSplitter,
				}
			],
			rowGutters: [
				{
                    track: 1,
					element: leftPaneSplitter,
				}
			]
		});
	});
</script>

<div class="root">
	<TopBar />

	<div class="content">
        <div class="outliner-area">
		<OutlinerPanel />
        </div>

        <div class="server-area">
		<ServerPanel />
        </div>

		<div class="editor-area">
			<BoardPanel />
		</div>

		<div class="inspector-area">
			<InspectorPanel />
		</div>

		<div class="left-splitter" bind:this={leftSplitter} />
		<div class="right-splitter" bind:this={rightSplitter} />
		<div class="leftpane-splitter" bind:this={leftPaneSplitter} />
	</div>
</div>

<style>
	.root {
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.content {
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

	.editor-area {
		grid-area: content;
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
