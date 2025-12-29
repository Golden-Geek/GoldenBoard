<script lang="ts">
	import TreeView from '$lib/components/TreeView.svelte';
	import WidgetRenderer from '$lib/widget/WidgetRenderer.svelte';

	let { board } = $props();
</script>

<div class="board-view">
	<WidgetRenderer {board} widget={board.rootWidget} />
</div>

<style>
	.board-view {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
	}
</style>
