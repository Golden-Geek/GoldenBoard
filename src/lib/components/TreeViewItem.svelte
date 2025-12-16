<script lang="ts">
	import { onMount } from 'svelte';
	import Self from './TreeViewItem.svelte';
	import { getNodeIcon } from '$lib/editor/editor.svelte';
	import { slide } from 'svelte/transition';
	let { node, level } = $props();

	let isExpanded: boolean = $state(level < 3);
	let hasChildren = $state(false);
	let extendedType: string | undefined = $state(undefined);

	$effect(() => {
		hasChildren = node.CONTENTS != null;
		if(!hasChildren)
        {
            if(node.EXTENDED_TYPE) extendedType = node.EXTENDED_TYPE[0];
            else if(node.TYPE == "N") extendedType = "Trigger";
        }
    });

</script>

<div class="treeview-item {isExpanded ? 'expanded' : 'collapsed'}">
	{#if level > 0}
		<p class="title level-{level} {hasChildren ? 'container' : 'controllable'}">
			{#if hasChildren}
				<button
					class="expand-btn"
					aria-label={isExpanded ? 'Collapse' : 'Expand'}
					onclick={() => {
						isExpanded = !isExpanded;
					}}
				>
					{isExpanded ? '▾' : '▸'}
				</button>
			{:else if extendedType}
				<span class="icon">
					{getNodeIcon(extendedType)}
				</span>
			{/if}
			{node.DESCRIPTION}
		</p>
	{/if}
	{#if isExpanded && hasChildren}
		<div class="children {level == 0 ? 'first-level' : ''}" transition:slide|local={{ duration: 300 }}>
			{#each Object.entries(node.CONTENTS) as [key, child]}
				<Self node={child} level={level + 1}></Self>
			{/each}
		</div>
	{/if}
</div>

<style>
	.treeview-item .title {
		font-size: 0.8rem;
		display: flex;
		align-items: center;
		cursor: pointer;
		user-select: none;
		display: inline;
		padding: 0.4rem;
		border-radius: 0.25rem;
		transition: background-color 0.1s ease;
	}

	.treeview-item .title.container {
		font-weight: bold;
        color: rgba(from var(--text-color) r g b / 60%);
	}

	.treeview-item .title.level-1 {
		font-size: 0.9rem;
	}

	.treeview-item .title .icon {
		margin-right: 0.25rem;
		font-size: 0.9rem;
	}

	.treeview-item .title:hover {
		background-color: rgba(200, 200, 200, 0.2);
	}

	.treeview-item .expand-btn {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.8rem;
		margin-right: 0.25rem;
		padding: 0;
	}

	.treeview-item .children:not(.first-level) {
		margin-left: 0.7rem;
		padding-left: 0.1rem;
		border-left: solid 1px rgba(200, 200, 200, 0.2);
	}
</style>
