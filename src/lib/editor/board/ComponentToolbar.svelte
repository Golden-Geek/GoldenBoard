<script>
    import { boardData } from "$lib/boards.svelte";
    import { componentTypes, editorState } from "../editor.svelte";
</script>

<div class="component-toolbar" class:open={editorState.editMode}>
    <div class="content">
        {#each Object.entries(componentTypes) as type}
            <span class="tool" use:dndAction={{ type: 'tool', data: type[0] }}>{type[1].icon}</span>
        {/each}
    </div>
</div>

<style>
    .component-toolbar {
        flex: 0 0 0px;
        overflow: hidden;

        background-color: #111;
        box-shadow: 0 -5px 5px rgba(0, 0, 0, 0.2);
        height: 3em;
        transition: flex-basis 0.3s ease-in-out;
    }

    .component-toolbar.open {
        transform: translateY(0);
        flex-basis: 50px;
    }

    .content {
        display: flex;
        flex-direction: row;
        justify-content: space-around;
        align-items: center;
        box-sizing: border-box;
        height: 100%;
    }

    .tool {
        font-size: 1.5em;
        cursor: pointer;
        padding: 4px;
        border-radius: 5px;
        transition: background-color 0.6s;
        user-select: none;
    }

    .tool:hover {
        transition: background-color 0.1s;
        background-color: rgba(255, 255, 255, 0.2);
    }
</style>
