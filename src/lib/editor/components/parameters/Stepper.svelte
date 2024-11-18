<script>
    import { editorState } from "$lib/editor/editor.svelte";

    let { comp, parameter, classes, css } = $props();
</script>


<input
    type="number"
    class={classes}
    style={css}
    disabled={editorState.editMode}
    min="{comp.options?.minValue || 0}"
    max="{comp.options?.maxValue || 1}"
    step="0.0001"
/>

<style>
    input {
        width: 100%;
    }
</style>
