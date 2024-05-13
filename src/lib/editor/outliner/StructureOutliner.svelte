<script>
    import { onMount } from "svelte";
    import { onDestroy } from "svelte";
    import TreeView from "./StructureTreeView.svelte";
    import controlStructure from "$lib/oscquery/oscquery";
    import { editMode, outlinerOpen } from "../store";

    let outliner;

    let structureObject = null;

    controlStructure.subscribeToStructureUpdates("/", true, () => {
        structureObject = controlStructure.structureObject;
    });
</script>

<div
    bind:this={outliner}
    class="outliner {$editMode && $outlinerOpen ? 'open' : 'closed'}"
>
    <div class="outliner-content">
        <h1>Structure Outliner</h1>
        {#key structureObject}
            {#if structureObject}
                <TreeView tree={structureObject} />
            {/if}
        {/key}
    </div>
</div>

<style>
    .outliner {
        height: 50%;
        color: #ccc;
        overflow-x: hidden;
        background-color: #333;
        box-shadow: 10px 0 10px rgba(0, 0, 0, 0.3);
        flex: 0 0 0px;
        transition: flex-basis 0.3s ease;
        z-index: 1;
    }

    .outliner.overlay {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.5);
    }

    .outliner.open {
        position: relative;
        flex-basis: 300px;
    }

    .outliner .outliner-content {
        padding: 10px;
        box-sizing: border-box;
        width: 300px;
        height: 100%;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        user-select: none;
    }

    .outliner.open .outliner-content {
        transform: translateX(0);
    }

    h1 {
        font-size: 1.5em;
        margin: 0 0 10px 0;
        text-align: center;
    }

    pre {
        white-space: pre-wrap;
    }
</style>
