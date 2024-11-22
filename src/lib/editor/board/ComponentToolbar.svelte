<script>
    import { boardData } from "$lib/boards.svelte";
    import { dndzone, TRIGGERS } from "svelte-dnd-action";
    import { componentTypes, editorState } from "../editor.svelte";
    import { v4 as uuidv4 } from "uuid";

    let tools = [];
    Object.entries(componentTypes).forEach((type) => {
        tools.push({
            type: type[0],
            icon: type[1].icon,
            id: type[0] + "-" + uuidv4(),
            options: { label: type[1].name },
        });
    });

    function handleDndConsider(e) {
        const { trigger, id } = e.detail.info;
        if (trigger == TRIGGERS.DRAG_STARTED) {
            const tool = tools.find((tool) => tool.id === id);
            const index = tools.indexOf(tool);
            const newId = tool.type + "-" + uuidv4();
            e.detail.items.splice(index, 1, { ...tools[index], id: newId });
        tools = e.detail.items;
    }
    }

    function handleDndFinalize(e) {
        tools = e.detail.items;
    }
</script>

<div class="component-toolbar" class:open={editorState.editMode}>
    <div
        class="content"
        use:dndzone={{
            items: tools,
            centreDraggedOnCursor: true,
            dropTargetClasses: ["dnd-dragging"],
            dropTargetStyle: {},
            dropFromOthersDisabled: true,
            morphDisabled:true
        }}
        on:consider={handleDndConsider}
        on:finalize={handleDndFinalize}
    >
            {#each tools as tool (tool.id)}
                <span class="tool"> {tool.icon}</span>
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
