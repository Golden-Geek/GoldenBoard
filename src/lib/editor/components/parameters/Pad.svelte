<script>
    import { editorState } from "$lib/editor/editor.svelte";

    let { comp, parameter, classes, css } = $props();
</script>

<div class={classes}
style={css}
disabled={editorState.editMode}>
    PAD
</div>

<style>
  
</style>
