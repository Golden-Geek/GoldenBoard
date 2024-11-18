<script>
    import UIComponent from "../components/UIComponent.svelte";
    import { editorState } from "../editor.svelte";
    import ComponentToolbar from "./ComponentToolbar.svelte";

    let board = $derived(editorState.selectedBoard);
</script>

{#if editorState.selectedBoard}
    <div class="board">
        <div class="main">
            <UIComponent comp={editorState.selectedBoard} isMain={true} />
        </div>
        <ComponentToolbar />
    </div>
{/if}

<style>
    .board {
        flex-grow: 1;
        display: flex;
        height: 100%;
        flex-direction: column;
        background-color: #333;
        overflow: hidden;
        background-color: #222;
    }

    .main {
        flex-grow: 1;
        display: flex;
        overflow: auto;
    }

</style>
