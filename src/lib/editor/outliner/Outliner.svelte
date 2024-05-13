<script>
    import { editMode, outlinerOpen, selectedComponents } from "$lib/editor/store";
    import { layout, getComponentWithId } from "$lib/editor/store";
    import { onMount } from "svelte";
    import { onDestroy } from "svelte";
    import TreeView from "./TreeView.svelte";

    let components = [];

    selectedComponents.subscribe((value) => {
        if (value.length == 0) {
            components = [];
            return;
        }

        components = value.map((id) => {return getComponentWithId(id)});
    });
</script>

<div class="components-outliner">
        <h1>Outliner</h1>
        {#key $layout}
        <TreeView tree={$layout.main} />
        {/key}
</div>
<style>

   
    .components-outliner {
        flex: 40% 1 0;
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
