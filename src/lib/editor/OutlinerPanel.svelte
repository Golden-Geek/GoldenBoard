<script lang="ts">
	import TreeView from '$lib/components/TreeView.svelte';
	import { mainData } from '$lib/engine.svelte';

	let selectedBoard = $derived(
		mainData.boardData.boards.find((b) => b.name === mainData.boardData.selectedBoard)!
	);
</script>

{#if selectedBoard != null}
	<TreeView
		data={selectedBoard!.rootWidget}
		showRoot={true}
		getChildren={(node: any) => node.children || []}
		getType={(node: any) => node.type}
		getTitle={(node: any) => node.props.label?.children?.text?.value || node.id || node.type || 'Widget'}
	></TreeView>
{/if}
