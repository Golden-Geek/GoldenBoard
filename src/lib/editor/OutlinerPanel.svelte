<script lang="ts">
	import TreeView from '$lib/components/TreeView.svelte';
	import {
		addWidgetToSelection,
		isWidgetSelected,
		mainData,
		menuContext,
		MenuContextType,
		selectOnlyWidget,
		toggleWidgetSelection
	} from '$lib/engine.svelte';
	import { getIconForWidgetType } from '$lib/widget/widgets.svelte';

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
		getIcon={(type: string) => getIconForWidgetType(type)}
		highlightColor={'var(--widget-color)'}
		onSelect={(node: any, e: MouseEvent) => {
			if (e.ctrlKey || e.metaKey) {
				toggleWidgetSelection(node.id);
			} else if (e.shiftKey) {
				addWidgetToSelection(node.id);
			} else {
				selectOnlyWidget(node.id);
			}
		}}
		isSelected={(node: any) => isWidgetSelected(node.id)}
		contextMenu={(node: any, e: MouseEvent) => {
			menuContext.type = MenuContextType.Widget;
			menuContext.target = node;
			menuContext.position = { x: e.clientX, y: e.clientY };
		}}
	></TreeView>
{/if}
