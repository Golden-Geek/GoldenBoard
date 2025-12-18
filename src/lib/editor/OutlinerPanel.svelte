<script lang="ts">
	import TreeView from '$lib/components/TreeView.svelte';
	import {
		addWidgetToSelection,
		isWidgetSelected,
		mainData,
		selectOnlyWidget,
		toggleWidgetSelection
	} from '$lib/engine.svelte';

	let selectedBoardID = $derived(
		mainData.boardData.boards.find((b) => b.id === mainData.boardData.selectedBoardID)!
	);
</script>

{#if selectedBoardID != null}
	<TreeView
		data={selectedBoardID!.rootWidget}
		showRoot={true}
		getChildren={(node: any) => node.children || []}
		getType={(node: any) => node.type}
		getTitle={(node: any) =>
			node.props.label?.children?.text?.value || node.id || node.type || 'Widget'}
		highlightColor={'var(--widget-color)'}
		onSelect={(node:any, e: MouseEvent) => {
			if (e.ctrlKey || e.metaKey) {
				toggleWidgetSelection(node.id);
			} else if (e.shiftKey) {
				addWidgetToSelection(node.id);
			} else {
				selectOnlyWidget(node.id);
			}
		}}
		isSelected={(node: any) => isWidgetSelected(node.id)}
	></TreeView>
{/if}
