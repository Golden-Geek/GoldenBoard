<script>
    import OutlinerTreeItem from "./OutlinerTreeItem.svelte";
    import { editorState } from "../editor.svelte.js";
    import { boardData } from "$lib/boards.svelte.js";

    $effect(() => {
        if (editorState.selectedBoard == null) {
            editorState.selectedBoard = boardData.boards?boardData.boards[0]:null;
        }
    });
</script>

<div
    class="outlinerPanel"
    class:open={editorState.editMode && editorState.outlinerOpen}
>
    <h1>Outliner</h1>
    {#key editorState.selectedBoard}
    <select class="boardSelector" bind:value={editorState.selectedBoard}>
        {#each boardData.boards as board}
            <option value={board}
                >{board.options?.label ? board.options.label : board.id}</option
            >
        {/each}
    </select>
    {/key}

    <div class="outliner">
        <div class="outliner-content">
            {#if editorState.selectedBoard}
                <OutlinerTreeItem data={editorState.selectedBoard} />
            {/if}
        </div>
    </div>
</div>

<style>
    h1 {
        text-align: center;
    }

    .boardSelector {
        position: absolute;
        right: 5px;
        top: 5px;
        float: right;
    }

    .outlinerPanel {
        position: relative;
        height: 100%;
        color: #ccc;
        overflow-x: hidden;
        background-color: #333;
        box-shadow: 10px 0 10px rgba(0, 0, 0, 0.3);
        flex: 0 0 0px;
        transition: flex-basis 0.3s ease;
        z-index: 1;
    }

    .outlinerPanel.open {
        position: relative;
        flex-basis: 300px;
    }

    .outlinerPanel .outlinerPanel-content {
        padding: 10px;
        box-sizing: border-box;
        width: 300px;
        height: 100%;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        user-select: none;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .outlinerPanel.open .outliner-content {
        transform: translateX(0);
    }

    .outliner
    {
        min-width: 150px;
    }
</style>
