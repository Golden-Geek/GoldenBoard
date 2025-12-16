<script>
	import TreeViewItem from '$lib/components/TreeViewItem.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		// You can perform any setup here if needed
		console.log('TreeView mounted with data:', $state.snapshot(data));
	});
</script>

<div class="treeview">
	{#if data}
		<TreeViewItem node={data} level={0} />
	{:else}
		<p>No data available</p>
	{/if}
</div>

<style>
	.treeview {
		margin-top:.5rem;
        width: 100%;
        overflow: auto;
	}
</style>
