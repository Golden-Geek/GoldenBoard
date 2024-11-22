<script>
    import { editorState } from "$lib/editor/editor.svelte";

    let { comp, parameter, classes, css } = $props();
</script>

<input
    type="text"
    class={classes}
    style={css}
    disabled={editorState.editMode}
/>

<style>
    input {
        width: 100%;
    }
</style>
