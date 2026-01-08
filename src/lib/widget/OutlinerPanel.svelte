<script lang="ts">
	import TreeView from '$lib/components/TreeView.svelte';
	import { mainState, menuContext, MenuContextType } from '$lib/engine/engine.svelte';
	import { dndState } from '$lib/engine/draganddrop.svelte';
	import { saveData } from '$lib/engine/engine.svelte';
	import { Widget } from '$lib/widget/widgets.svelte';

	let selectedBoard = $derived(mainState.selectedBoard);

	function handleDrop(dragged: Widget) {
		const candidate = dndState.dropCandidate;
		if (!candidate || candidate.type !== 'tree-item') return;
		const target = candidate.target as Widget;
		const position = candidate.position ?? 'after';

		if (!target || target === dragged) return;
		if (!target.parent || !target.parent.children) return; // cannot insert relative to root or detached

		const fromParent = dragged.parent;
		const toParent = target.parent;
		if (!toParent.children) return;

		// remove from old parent
		if (fromParent && fromParent.children) {
			const oldIndex = fromParent.children.indexOf(dragged);
			if (oldIndex !== -1) {
				fromParent.children.splice(oldIndex, 1);
			}
		}

		let insertIndex = toParent.children.indexOf(target);
		if (insertIndex === -1) return;
		if (position === 'after') insertIndex += 1;
		// adjust when moving within same parent past original position
		if (fromParent === toParent) {
			const oldIndex = toParent.children.indexOf(dragged);
			if (oldIndex !== -1 && oldIndex < insertIndex) {
				insertIndex -= 1;
			}
		}

		toParent.children.splice(insertIndex, 0, dragged);
		dragged.parent = toParent;

		saveData('Reorder Widget');
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
