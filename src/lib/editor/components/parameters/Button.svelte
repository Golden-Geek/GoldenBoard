<script>
    import { editorState } from "$lib/editor/editor.svelte";
    import { onMount } from "svelte";

    let { comp, parameter, classes, css } = $props();
    let active = $state(false);

</script>

<button
    class={classes}
    class:active
    style={css}
    disabled={editorState.editMode}
    onclick={(e) => {
        active = true;
        setTimeout(() => (active = false), 10);
    }}
>
    {comp?.options?.label || comp.id}
</button>

<style>
    /* cool dark theme button with round corners, shadows and hover behaviour*/
    button {
        background-color: #333;
        width: 100%;
        height: 100%;
        color: #ccc;
        border: none;
        border-radius: 4px;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
        transition: background-color 0.2s ease-out;
        user-select: none;
    }

    button:not([disabled]):hover {
        cursor: pointer;
        background-color: #3a3a3a;
    }

    button:not([disabled]).active {
        box-shadow: none;
        background-color: rgb(162, 70, 23);
        transition: background-color 0s ease-out;
        transform: translateY(2px);
    }
</style>
