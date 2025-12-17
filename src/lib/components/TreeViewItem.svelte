<script lang="ts">
	import { onMount } from 'svelte';
	import Self from './TreeViewItem.svelte';
	import { getNodeIcon } from '$lib/oscquery/servers.svelte';
	import { slide } from 'svelte/transition';
	let { node, level, showRoot = false, getChildren, getType, getIcon = null, getTitle, isContainer = null } = $props();

	let isExpanded: any = $derived(() => level < 3);

	let type: any = $derived(getType(node));

	let children: any = $derived(getChildren(node));
	let hasChildren: any = $derived(isContainer ? isContainer(node) : children.length > 0);
</script>

<div class="treeview-item {isExpanded ? 'expanded' : 'collapsed'}">
	{#if level > 0 || showRoot}
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
			{:else if type}
				{#if getIcon}
					<span class="icon">
						{getIcon(type)}
					</span>
				{/if}
			{/if}
			{getTitle(node)}
		</p>
	{/if}
	{#if isExpanded && node != null && hasChildren}
		<div
			class="children {level == 0 ? 'first-level' : ''}"
			transition:slide|local={{ duration: 300 }}
		>
			{#each children as child}
				<Self node={child} level={level + 1} {getChildren} {getType} {getIcon} {getTitle} {isContainer}></Self>
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
