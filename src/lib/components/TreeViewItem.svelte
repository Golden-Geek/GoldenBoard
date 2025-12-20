<script lang="ts">
	import Self from './TreeViewItem.svelte';
	import { slide } from 'svelte/transition';
	let {
		node,
		level,
		showRoot = false,
		getChildren,
		getIcon = null,
		getTitle,
		isContainer = null,
		highlightColor = '',
		onSelect = null,
		isSelected = null,
		contextMenu = null
	} = $props();

	let isExpanded: any = $derived(() => level < 3);

	let children: any = $derived(getChildren(node));
	let hasChildren: any = $derived(isContainer ? isContainer(node) : children.length > 0);
</script>

<div
	class="treeview-item {isExpanded ? 'expanded' : 'collapsed'} "
	style={highlightColor != '' ? `--highlight-color: ${highlightColor}` : ''}
>
	{#if level > 0 || showRoot}
		<p
			class="title level-{level} {hasChildren ? 'container' : 'controllable'} {isSelected &&
			isSelected(node)
				? 'selected'
				: ''}"
			oncontextmenu={(e) => {
				if (contextMenu) {
					contextMenu(node, e);
					e.preventDefault();
				}
			}}
			onclick={(e) => {
				if (onSelect) {
					onSelect(node, e);
				}
			}}
		>
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
			{/if}

			{#if getIcon}
				<span class="icon">
					{getIcon(node)}
				</span>
			{/if}
			{getTitle(node)}
		</p>
	{/if}
	{#if isExpanded && node != null && hasChildren}
		<div
			class="children {level == 0 && !showRoot ? 'first-level' : ''}"
			transition:slide|local={{ duration: 300 }}
		>
			{#each children as child}
				<Self
					node={child}
					level={level + 1}
					{getChildren}
					{getIcon}
					{getTitle}
					{isContainer}
					{highlightColor}
					{onSelect}
					{isSelected}
					{contextMenu}
				></Self>
			{/each}
		</div>
	{/if}
</div>

<style>
	.treeview-item {
		--highlight-color: rgba(200, 200, 200);
	}

	.treeview-item .title {
		font-size: 0.8rem;
		display: flex;
		align-items: center;
		cursor: pointer;
		user-select: none;
		display: inline;
		padding: 0.1rem 0.5rem;
		border-radius: 0.3rem;
		border: 1px solid transparent;
		transition: background-color 0.1s ease;
	}

	.treeview-item .title.container {
		font-weight: bold;
		color: rgba(from var(--text-color) r g b / 60%);
	}

	.treeview-item .title.level-1 {
		font-size: 0.9rem;
	}

	.treeview-item .title.selected {
		background-color: rgba(from var(--highlight-color) r g b / 30%) !important;
		border: 1px solid rgba(from var(--highlight-color) r g b / 80%);
	}

	.treeview-item .title:hover {
		background-color: rgba(from var(--highlight-color) r g b / 30%);
	}

	.treeview-item .title .icon {
		margin-right: 0.25rem;
		font-size: 0.9rem;
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
