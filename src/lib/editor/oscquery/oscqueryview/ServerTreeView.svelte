<script>
    import ServerTreeViewItem from "./ServerTreeViewItem.svelte";
    let { server = null } = $props();

</script>

{#if server}
    {#if server.hasData()}
        <ServerTreeViewItem node={server.data} />
    {/if}
{/if}
