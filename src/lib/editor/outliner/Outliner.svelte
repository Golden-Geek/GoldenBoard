<script>
    import OutlinerTreeItem from "./OutlinerTreeItem.svelte";
    import { editorState } from "../editor.svelte.js";
    import { boardData } from "$lib/boards.svelte.js";

    $effect(() => {
        if (editorState.selectedBoard == null) {
            editorState.selectedBoard = boardData.boards
                ? boardData.boards[0]
                : null;
        }
    });
</script>

<div class="outliner">
    <div class="header">
        <h1>Outliner</h1>
        {#key editorState.selectedBoard}
            <select
                class="boardSelector"
                bind:value={editorState.selectedBoard}
            >
                {#each boardData.boards as board}
                    <option value={board}
                        >{board.options?.label
                            ? board.options.label
                            : board.id}</option
                    >
                {/each}
            </select>
        {/key}
    </div>

    <div class="content">
        {#if editorState.selectedBoard}
            <OutlinerTreeItem data={editorState.selectedBoard} />
        {/if}
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

    .outliner {
        min-width: 150px;
    }

    .content {
        padding: 10px;
        box-sizing: border-box;
        min-width: 300px;
        height: 100%;
        transition: transform 0.3s ease;
        user-select: none;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
    }

    /* .outlinerPanel.open .outliner-content {
        transform: translateX(0);
    } */
</style>
