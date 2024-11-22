<script>
    import { addServer, servers } from "$lib/oscquery/oscquery.svelte.js";
    import { editorState } from "../editor.svelte.js";
    import ServerTreeView from "./oscqueryview/ServerTreeView.svelte";

    $effect(() => {
        if (editorState.selectedServer == null) {
            editorState.selectedServer = servers.length > 0 ? servers[0] : null;
        }
    });
</script>

<div class="serverExplorer">
    <div class="header">
        <h1>Servers</h1>
        {#key editorState.selectedServer}
            <select
                class="serverSelector"
                bind:value={editorState.selectedServer}
            >
                {#each servers as server}
                    <option value={server}>{server.name}</option>
                {/each}
            </select>
        {/key}

        <button class="add-bt" onclick={() => addServer()}> + </button>
    </div>
    {#key editorState.selectedServer}
        {#if editorState.selectedServer}
            <div class="settings">
                <p>
                    IP : <input
                        type="text"
                        bind:value={editorState.selectedServer.ip}
                        onblur={() => editorState.selectedServer.setup()}
                    />
                </p>
                <p>
                    Port : <input
                        type="text"
                        bind:value={editorState.selectedServer.port}
                        onblur={() => editorState.selectedServer.setup()}
                    />
                </p>
                Connected : {editorState.selectedServer.connected}
            </div>
            <div class="serverTree">
                <ServerTreeView server={editorState.selectedServer} />
            </div>
        {/if}
    {/key}
</div>

<style>
    .serverExplorer {
        border-top: solid 1px rgba(0, 0, 0, 0.2);
        padding-top: 10px;
        min-width: 150px;
        position: relative;
        box-sizing: border-box;
        display:flex;
        flex-direction: column;
        overflow:hidden;
    }

    h1 {
        text-align: center;
    }

    .serverSelector {
        position: absolute;
        right: 5px;
        top: 15px;
        float: right;
    }

    .add-bt {
        position: absolute;
        left: 5px;
        top: 15px;
        float: right;
    }

    .serverTree {
        min-width:300px;
        overflow-y: auto;
        flex-grow: 1;
    }
</style>
