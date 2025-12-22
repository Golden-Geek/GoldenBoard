<script lang="ts">
	import TreeView from '$lib/components/TreeView.svelte';
	import { mainState, menuContext, MenuContextType } from '$lib/engine/engine.svelte';
	import { Widget } from '$lib/widget/widgets.svelte';

	let selectedBoard = $derived(mainState.selectedBoard);
</script>

{#if selectedBoard != null}
	<TreeView
		data={selectedBoard!.rootWidget}
		showRoot={true}
		getChildren={(node: any) => node.children || []}
		getTitle={(node: any) => node.sanitizedIdentifier}
		getIcon={(node: any) => (node as Widget).icon}
		highlightColor={'var(--widget-color)'}
		onSelect={(node: any, e: MouseEvent) => {
			if (e.ctrlKey || e.metaKey) {
				(node as Widget).toggleSelect();
			} else if (e.shiftKey) {
				(node as Widget).selectToThis();
			} else {
				(node as Widget).select(true);
			}
		}}
		isSelected={(node: any) => (node as Widget).isSelected}
		contextMenu={(node: any, e: MouseEvent) => {
			menuContext.type = MenuContextType.Widget;
			menuContext.target = node;
			menuContext.position = { x: e.clientX, y: e.clientY };
		}}
	></TreeView>
{/if}
