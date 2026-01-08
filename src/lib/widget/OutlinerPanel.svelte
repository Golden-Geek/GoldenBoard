<script lang="ts">
	import TreeView from '$lib/components/TreeView.svelte';
	import { mainState, menuContext, MenuContextType } from '$lib/engine/engine.svelte';
	import { dndState } from '$lib/engine/draganddrop.svelte';
	import { moveWidget, Widget } from '$lib/widget/widgets.svelte';

	let selectedBoard = $derived(mainState.selectedBoard);

	function handleDrop(dragged: Widget) {
		const candidate = dndState.dropCandidate;
		if (!candidate || (candidate.type !== 'tree-item' && candidate.type !== 'widget')) return;
		const target = candidate.target as Widget;
		const position = candidate.position ?? 'after';
		const insertInto = candidate.insertInto ?? false;

		moveWidget(dragged, target, position, { insertInto, save: true });
	}
</script>

{#if selectedBoard != null}
	<TreeView
		data={selectedBoard!.rootWidget}
		showRoot={true}
		getChildren={(node: any) => node.children || []}
		getTitle={(node: any) => node.sanitizedIdentifier}
		getIcon={(node: any) => (node as Widget).icon}
		getLabelStyle={(node: any) => (node.userID != '' ? 'font-style: italic;' : '')}
		getWarningsAndErrors={(node: any) => node.warningsAndErrors}
		highlightColor="var(--widget-color)"
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
		onDrop={(widget: Widget) => handleDrop(widget)}
	></TreeView>
{/if}
