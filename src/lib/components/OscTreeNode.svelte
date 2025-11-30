<script lang="ts">
	import type { OscNode, OscValueType } from '$lib/services/oscquery';
	import {
		createDragData,
		pragmaticDraggable,
		type PragmaticDraggableConfig
	} from '$lib/drag/pragmatic';
	import { activeDragOperation, type OscNodeDrag } from '$lib/stores/drag';

	export let node: OscNode;
	export let depth = 0;

	let hasChildren = false;
	$: hasChildren = (node.children?.length ?? 0) > 0;
	let isLeaf = node.type !== 'container';
	$: isLeaf = node.type !== 'container';
	const typeIcons: Record<OscValueType, string> = {
		container: '🗄️',
		float: '🔣',
		int: '🔢',
		string: '🔗',
		color: '🎨',
		boolean: '☑️',
		trigger: '❗',
		unknown: '❔'
	};
	$: icon = typeIcons[node.type] ?? '·';
	let expanded = depth === 0;
	let currentPath = node.path;
	$: if (node.path !== currentPath) {
		currentPath = node.path;
		expanded = depth === 0;
	}
	let oscDraggable: PragmaticDraggableConfig | undefined;
	$: oscDraggable = buildOscNodeDraggableConfig();

	const buildOscNodeDraggableConfig = (): PragmaticDraggableConfig | undefined => {
		if (!isLeaf) return undefined;
		const intent: OscNodeDrag = {
			kind: 'osc-node',
			path: node.path,
			osctype: node.type,
			meta: {
				name: node.name,
				description: node.description,
				min: node.min,
				max: node.max,
				step: node.step,
				enumValues: node.enumValues,
				default: node.default
			}
		};
		return {
			enabled: true,
			getInitialData: () => createDragData(intent),
			events: {
				onDragStart: () => activeDragOperation.set({ intent, origin: 'osc' }),
				onDrop: () => activeDragOperation.set(null)
			}
		};
	};

	const toggle = (event: MouseEvent) => {
		event.stopPropagation();
		expanded = !expanded;
	};
</script>

{#if depth > 0}
<div
	class="osc-node {hasChildren ? 'parent-node' : 'leaf-node'}"
	style={`--depth:${depth}`}
	role="treeitem"
	tabindex="0"
	aria-selected="false"
	aria-expanded={hasChildren ? expanded : undefined}
	use:pragmaticDraggable={oscDraggable}
>
	{#if hasChildren}
		<button
			type="button"
			class="node-toggle"
			title="Toggle children"
			on:click={toggle}
			aria-label={expanded ? 'Collapse node' : 'Expand node'}
		>
			{expanded ? '▼' : '▶'}
		</button>
	{/if}
	<span class="node-label">
		<span class="node-icon" aria-hidden="true">{icon}</span>
		<span class="node-name">{node.description ?? node.name}</span>
	</span>
</div>
{/if}

{#if hasChildren && expanded}
	{#each node.children as child}
		<svelte:self node={child} depth={depth + 1} />
	{/each}
{/if}

<style>
	.node-label {
		display: flex;
		align-items: center;
		flex: 1;
		gap: 0.35rem;
	}

	.node-icon {
		font-size: 0.85rem;
		line-height: 1;
	}

	.node-name {
		font-size: 0.82rem;
		font-weight: 500;
	}

	.node-toggle {
		border: none;
		background: transparent;
		color: var(--muted);
		font-size: 0.6rem;
		/* width: .5rem; */
		/* height: .5rem; */
		padding: 0;
		/* margin-right: 0.25rem; */
		cursor: pointer;
		align-self: center;
	}
</style>
