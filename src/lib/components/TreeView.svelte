<script>
	import TreeViewItem from '$lib/components/TreeViewItem.svelte';
	import { onMount } from 'svelte';

	let {
		showRoot,
		data,
		getChildren,
		getIcon = null,
		getTitle,
		isContainer = null,
		highlightColor = '',
		onSelect = null,
		isSelected = null,
		contextMenu = null
	} = $props();
</script>

<div class="treeview">
	{#if data}
		<TreeViewItem
			node={data}
			{showRoot}
			level={0}
			{getChildren}
			{getIcon}
			{getTitle}
			{isContainer}
			{highlightColor}
			{onSelect}
			{isSelected}
			{contextMenu}
		/>
	{:else}
		<p>No data available</p>
	{/if}
</div>

<style>
	.treeview {
		padding-top: 0.2rem;
		width: 100%;
		height: 100%;
		overflow: auto;
	}
</style>
