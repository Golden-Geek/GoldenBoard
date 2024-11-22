<script>
    import ServerTreeViewItem from "./ServerTreeViewItem.svelte";
    let { server = null } = $props();
</script>

{#if server}
    {#if server.structureReady}
        <ServerTreeViewItem node={server.data} {server} />
    {/if}
{/if}
