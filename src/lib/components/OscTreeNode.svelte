<script lang="ts">
	import type { OscNode } from '$lib/services/oscquery';

	export let node: OscNode;
	export let depth = 0;

	const isLeaf = node.type !== 'container';

	const handleDragStart = (event: DragEvent) => {
		event.dataTransfer?.setData(
			'application/osc-node',
			JSON.stringify({ path: node.path, min: node.min, max: node.max, step: node.step, type: node.type })
		);
	};
</script>

<div
	class="osc-node"
	style={`--depth:${depth}`}
	draggable={isLeaf}
	role="treeitem"
	tabindex="0"
	aria-selected="false"
	on:dragstart={handleDragStart}
>
	<span>{node.name} <small>{node.path}</small></span>
</div>
{#if node.children?.length}
	{#each node.children as child}
		<svelte:self node={child} depth={depth + 1} />
	{/each}
{/if}
