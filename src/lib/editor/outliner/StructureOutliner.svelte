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

<div class="structure-outliner">
<h1>Structure Outliner</h1>
{#key structureObject}
    {#if structureObject}
        <TreeView tree={structureObject} />
    {/if}
{/key}
</div>

<style>

    .structure-outliner {
        overflow: auto;
        box-sizing: border-box;
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
