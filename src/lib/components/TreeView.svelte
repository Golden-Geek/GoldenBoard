<script>
	import TreeViewItem from '$lib/components/TreeViewItem.svelte';

	let {
		showRoot,
		data,
		getChildren,
		getIcon = null,
		getTitle,
		getLabelStyle = null,
		getWarningsAndErrors = null,
		isContainer = null,
		highlightColor = '',
		onSelect = null,
		isSelected = null,
		contextMenu = null,
		onDrop = null,
		dragDataType = 'tree-item'
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
			{getLabelStyle}
			{getWarningsAndErrors}
			{isContainer}
			{highlightColor}
			{onSelect}
			{isSelected}
			{contextMenu}
			{dragDataType}
		 	{onDrop}
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
