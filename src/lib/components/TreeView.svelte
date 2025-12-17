<script>
	import TreeViewItem from '$lib/components/TreeViewItem.svelte';
	import { onMount } from 'svelte';

	let { showRoot, data, getChildren, getType, getIcon = null, getTitle, isContainer = null } = $props();
</script>

<div class="treeview">
	{#if data}
		<TreeViewItem node={data} {showRoot} level={0} {getChildren} {getType} {getIcon} {getTitle} {isContainer} />
	{:else}
		<p>No data available</p>
	{/if}
</div>

<style>
	.treeview {
		margin-top: 0.5rem;
		width: 100%;
		height:100%;
		overflow: auto;
	}
</style>
