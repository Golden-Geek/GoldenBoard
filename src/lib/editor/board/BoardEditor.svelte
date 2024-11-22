<script>
    import UIComponent from "../components/UIComponent.svelte";
    import { editorState } from "../editor.svelte";
    import ComponentToolbar from "./ComponentToolbar.svelte";

    let board = $derived(editorState.selectedBoard);
</script>

{#if board}
    <div class="board">
        <div class="main">
            <UIComponent comp={board} isMain={true} />
        </div>
        <ComponentToolbar />
    </div>
{/if}

<style>
    .board {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        height: 100%;
        background-color: #333;
        overflow: hidden;
        background-color: #222;
    }

    .main {
        flex-grow: 1;
        display: flex;
        height:100%;
        overflow: auto;
    }
</style>
