<script>
    import { editMode, selectedComponents } from "$lib/editor/store";
    import { layout, getComponentWithId } from "$lib/editor/store";
    import { onMount } from "svelte";
    import { onDestroy } from "svelte";

    let inspector;
    let components = [];

    selectedComponents.subscribe((value) => {
        if (value.length == 0) {
            components = [];
            return;
        }

        components = value.map((id) => {return getComponentWithId(id)});
    });
</script>

<div bind:this={inspector} class="inspector {$editMode ? 'editing' : 'hidden'}">
    <div class="inspector-content" >
        <h1>{components.length > 0? components.map((comp) => { return comp.options.label}) : "No Item selected"}</h1>
        <pre>{JSON.stringify(components.length > 0?components.map((comp) => { return comp}):$layout, null, 2)}</pre>
    </div>
</div>

<style>
    .inspector {
        height: 100%;
        color: #ccc;
        overflow-x: hidden;
        background-color: #333;
        /* transform: translateX(100%); */
        box-shadow: -10px 0 10px rgba(0, 0, 0, 0.3);
        flex: 0 0 0px;
        transition: flex-basis 0.3s ease;
    }

    .inspector.overlay {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.5);
    }

    .inspector.editing {
        position: relative;
        flex-basis: 400px;
    }

    .inspector .inspector-content {
        padding:10px;
        box-sizing: border-box;
        width: 400px;
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
