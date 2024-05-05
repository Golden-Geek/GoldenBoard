<script>
    import { editMode, outlinerOpen, selectedComponents } from "$lib/editor/store";
    import { layout, getComponentWithId } from "$lib/editor/store";
    import { onMount } from "svelte";
    import { onDestroy } from "svelte";
    import TreeView from "./TreeView.svelte";

    let outliner;
    let components = [];

    selectedComponents.subscribe((value) => {
        if (value.length == 0) {
            components = [];
            return;
        }

        components = value.map((id) => {return getComponentWithId(id)});
        console.log(components);
    });
</script>

<div bind:this={outliner} class="outliner {($editMode && $outlinerOpen) ? 'open' : 'closed'}">
    <div class="outliner-content" >
        <h1>Outliner</h1>
        <TreeView bind:tree={$layout.main} />
    </div>
</div>

<style>
    .outliner {
        height: 100%;
        color: #ccc;
        overflow-x: hidden;
        background-color: #333;
        /* transform: translateX(100%); */
        box-shadow: -10px 0 10px rgba(0, 0, 0, 0.3);
        flex: 0 0 0px;
        transition: flex-basis 0.3s ease;
    }

    .outliner.overlay {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.5);
    }

    .outliner.open {
        position: relative;
        flex-basis: 400px;
    }

    .outliner .outliner-content {
        padding:10px;
        box-sizing: border-box;
        width: 300px;
        height: 100%;
    }

    h1 {
        font-size: 1.5em;
        margin: 0 0 10px 0;
    }

    pre {
        white-space: pre-wrap;
    }
</style>
