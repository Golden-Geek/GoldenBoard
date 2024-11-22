<script>
    import {
        dragDropState,
        editorState,
        layoutTypes,
    } from "$lib/editor/editor.svelte";
    import { flip } from "svelte/animate";
    import UIComponent from "../UIComponent.svelte";

    import { onMount } from "svelte";
    import {
        dndzone,
        SHADOW_ITEM_MARKER_PROPERTY_NAME,
        SHADOW_PLACEHOLDER_ITEM_ID,
        TRIGGERS,
    } from "svelte-dnd-action";
    import { v4 as uuidv4 } from "uuid";

    let { comp, parentComp, css } = $props();
    let layout = $derived(comp.options?.layout || layoutTypes.FREE);
    let isFreeLayout = $derived(layout == layoutTypes.FREE);
    let directOver = $state(false);
    let containerDiv;

    // //Dragging
    const flipDurationMs = 100;
    let mouseX = 0,
        mouseY = 0;

    let isDraggingOver = false;

    function handleDndConsider(e) {
        if (
            e.detail.info.trigger == TRIGGERS.DRAG_STARTED ||
            e.detail.info.trigger == TRIGGERS.DRAGGED_ENTERED
        ) {
            isDraggingOver = true;
        } else if (e.detail.info.trigger == TRIGGERS.DRAGGED_LEFT) {
            isDraggingOver = false;
            editorState.dragExpandedGaps = true;
        }

        if (e.detail.info.trigger == TRIGGERS.DRAG_STARTED) {
            dragDropState.dragContainerSource = comp.id;
            editorState.dragExpandedGaps = false;
        }

        if ((e.detail.info.trigger = TRIGGERS.DRAGGED_OVER_INDEX)) {
            if (isFreeLayout) setXY(e);
        }

        if (comp.id != SHADOW_PLACEHOLDER_ITEM_ID)
            comp.children = e.detail.items;
    }

    function handleDndFinalize(e) {
        let sameElement = comp.id == dragDropState.dragContainerSource; //last event to fire is this one
        if (isFreeLayout) setXY(e);
        comp.children = e.detail.items;
        isDraggingOver = false;
        editorState.dragExpandedGaps = false;
    }

    function setXY(e) {
        let item = e.detail.items.find((c) => c.id == e.detail.info.id);
        if (item != null) {
            if (item.options == null) item.options = {};
            if (item.options.style == null) item.options.style = {};

            let w = item.options.style.width
                ? parseInt(item.options.style.width.replace(/px|%/, ""))
                : 100;
            let h = item.options.style.height
                ? parseInt(item.options.style.height.replace(/px|%/, ""))
                : 50;
            item.options.style.left = mouseX - w / 2 + "px";
            item.options.style.top = mouseY - h / 2 + "px";
        }
    }

    function handleMouseDown(e) {
        if (!editorState.editMode || !directOver) return;
        if (e.ctrlKey) editorState.selectedComponents.push(comp);
        else editorState.selectedComponents = [comp];
    }

    function handleMouseMove(e) {
        if (isFreeLayout && isDraggingOver) {
            mouseX = e.clientX - containerDiv.getBoundingClientRect().left;
            mouseY = e.clientY - containerDiv.getBoundingClientRect().top;
        }
    }
</script>

<section
    bind:this={containerDiv}
    role="region"
    aria-label="Container {comp.id}"
    class="ui-container layout-{layout}"
    class:editing={editorState.editMode}
    class:direct-over={directOver}
    class:dragExpandedGaps={editorState.dragExpandedGaps}
    onmousemove={(e) => (directOver = e.target == containerDiv)}
    onmouseleave={(e) => (directOver = false)}
    onclick={handleMouseDown}
    onconsider={handleDndConsider}
    onfinalize={handleDndFinalize}
    use:dndzone={{
        items: comp.children,
        flipDurationMs,
        dragDisabled: !editorState.editMode,
        morphDisabled: true,
        centreDraggedOnCursor: layout != layoutTypes.FREE,
        dropTargetClasses: ["dnd-dragging"],
        dropTargetStyle: {},
    }}
    style={css}
>
    {#if comp.children}
        {#each comp.children as item (item.id)}
            <div
                class="dnd-wrapper"
                data-is-dnd-shadow-item-hint={item[
                    SHADOW_ITEM_MARKER_PROPERTY_NAME
                ]}
                style={isFreeLayout
                    ? Object.entries(item.options?.style)
                          .map(([key, value]) => `--${key}:${value}`)
                          .join(";") + ";"
                    : ""}
                animate:flip={{ duration: flipDurationMs }}
            >
                <UIComponent comp={item} parentComp={comp} />
            </div>
        {/each}
    {/if}
</section>

<svelte:window onmousemove={handleMouseMove} />

<style>
    .ui-container {
        /* Common container styles */
        --gap: initial;

        background-color: rgba(255, 255, 255, 0.05);
        position: relative;
        padding: 5px;
        width: 100%;
        height: 100%;
        gap: var(--gap, 5px);
        box-sizing: border-box;
        cursor: initial;
        border: 1px solid rgba(255, 255, 255, 0);
        transition:
            border 0.2s ease,
            padding 0.2s ease,
            gap 0.2s ease;
    }

    .ui-container.dnd-dragging.dragExpandedGaps {
        gap: calc(var(--gap, 5px) + 10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 20px;
    }

    .ui-container.layout-free {
        overflow: auto;
    }

    :global(.ui-container.layout-free > *) {
        position: absolute !important;
    }

    .ui-container.layout-horizontal {
        display: flex;
        flex-direction: row;
    }

    .ui-container.layout-vertical {
        display: flex;
        flex-direction: column;
    }

    .ui-container.layout-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-gap: var(--gap, 5px);
        transition: grid-gap 0.3s ease;
    }

    .dnd-wrapper {
        display: block;
        --left: initial;
        --top: initial;
        --width: initial;
        --height: initial;
        --size: initial;
        --shrink: initial;

        left: var(--left, 0);
        top: var(--top, 0);
        width: var(--width, 100%);
        height: var(--height, 100%);

        flex-basis: var(--size, initial);
        flex-shrink: var(--shrink, initial);
    }

    .ui-container.layout-free > .dnd-wrapper {
        position: absolute;
        width: var(--width, 100px);
        height: var(--height, 50px);
    }
</style>
