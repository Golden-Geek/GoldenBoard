<script>
    import {
        ComponentTypes,
        editMode,
        finishUpdateComponent,
        getUniqueID,
        selectedComponents,
        startUpdateComponent,
    } from "$lib/editor/store";

    import { layout, getComponentWithId } from "$lib/editor/store";
    import { onMount } from "svelte";
    import { onDestroy } from "svelte";
    import { flip } from "svelte/animate";
    import {
        dndzone,
        SHADOW_ITEM_MARKER_PROPERTY_NAME,
        TRIGGERS,
    } from "svelte-dnd-action";

    let toolboxList;
    let flipDurationMs = 150;

    function handleDndConsider(e) {
        if (e.detail.info.trigger == TRIGGERS.DRAG_STARTED) {
            console.log("drag started", e);
            startUpdateComponent();
        }
        // tools = generateTools();
    }

    function handleDndFinalize(e) {
        console.log("drag finalized", e);
        tools = generateTools();
        finishUpdateComponent();
    }

    let tools = generateTools();

    function generateTools() {
        let result = [];
        Object.entries(ComponentTypes).forEach((element) => {
            result.push({
                id: getUniqueID(element[0]),
                type: element[0],
                tool: true,
                options: { label: element[1].name },
            });
        });
        return result;
    }
</script>

<div class="comptoolbox {$editMode ? 'editing' : 'hidden'}">
    <section
        bind:this={toolboxList}
        use:dndzone={{
            items: tools,
            flipDurationMs,
            dragDisabled: !$editMode,
            centreDraggedOnCursor: true,
            dropTargetClasses: ["dnd-dragging"],
            dropTargetStyle: {},
            dropFromOthersDisabled: true,
        }}
        on:consider={handleDndConsider}
        on:finalize={handleDndFinalize}
        class="comptoolbox-content"
    >
        {#key tools}
            {#each tools as item (item.id)}
                <div
                    class="toolbox-item"
                    animate:flip={{ duration: flipDurationMs }}
                >
                    {item.options.label}
                </div>
            {/each}
        {/key}
    </section>
</div>

<style>
    .comptoolbox {
        width: 100%;
        color: #ccc;
        overflow-x: hidden;
        background-color: #333;
        /* transform: translateX(100%); */
        box-shadow: -10px 0 10px rgba(0, 0, 0, 0.3);
        flex: 0 0 0px;
        transition: flex-basis 0.3s ease;
        font-size: 12px;
    }

    .comptoolbox.overlay {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.5);
    }

    .comptoolbox.editing {
        position: relative;
        flex-basis: 40px;
    }

    .comptoolbox .comptoolbox-content {
        height: 100%;
        padding: 10px;
        box-sizing: border-box;
        display: flex;
        justify-content: center;
    }

    .comptoolbox-content .toolbox-item {
        margin-right: 10px;
        cursor: grab;
        background-color: #ccc;
        padding: 5px;
        border-radius: 5px;
        color: #333;
        user-select: none;
    }

    .comptoolbox-content li:hover {
        background-color: #999;
        color: #fff;
    }
</style>
