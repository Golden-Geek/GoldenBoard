<script>
    import { boardData } from "$lib/boards.svelte";
    import { editorState } from "../editor.svelte";
</script>

<div class="component-toolbar" class:open={editorState.editMode}>
    Toolbox
</div>

<style>
    .component-toolbar {
        display: flex;
        flex-direction: row;
        background-color: #111;
        box-shadow: 0 -5px 5px rgba(0, 0, 0, 0.2);
        height: 3em;
        padding: 1em;
        box-sizing: border-box;
        transition: transform 0.3s ease-in-out;
        transform: translateY(100%);
    }

    .component-toolbar.open {
        transform: translateY(0);
    }
</style>
