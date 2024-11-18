<script>
    import { editorState, layoutTypes } from "$lib/editor/editor.svelte";
    import { flip } from "svelte/animate";
    import UIComponent from "../UIComponent.svelte";

    // import { onMount } from "svelte";
    // import {
    //     Layouts,
    //     dragContainerSource,
    //     editMode,
    //     layout,
    //     startUpdateComponent,
    //     finishUpdateComponent,
    //     selectComponent,
    // } from "$lib/editor/store";
    // import { flip } from "svelte/animate";
    // import {
    //     dndzone,
    //     SHADOW_ITEM_MARKER_PROPERTY_NAME,
    //     TRIGGERS,
    // } from "svelte-dnd-action";
    // import { SetAction } from "@gira-de/svelte-undo";
    // import { writable } from "svelte/store";

    // // export let sendValueFunc; //to avoid warning

    // //layout
    // export let layoutData;

    // let containerElem;
    // if (!layoutData.options.layout) layoutData.options.layout = Layouts.FREE;

    // let children = layoutData.children;
    // let isFreeLayout = layoutData.options.layout == Layouts.FREE;
    // let css = "";

    // let directOver = "";

    // //Dragging
    // const flipDurationMs = 100;
    // let mouseX = 0,
    //     mouseY = 0;

    // if (layoutData.options?.style) {
    //     css =
    //         Object.entries(layoutData.options?.style)
    //             .map(([key, value]) => `--${key}:${value}`)
    //             .join(";") + ";";
    // } else {
    // }

    // if (layoutData.options?.customCSS) css += layoutData.options.customCSS;

    // function handleDndConsider(e) {
    //     if (e.detail.info.trigger == TRIGGERS.DRAG_STARTED) {
    //         dragContainerSource.set(e.srcElement);
    //         startUpdateComponent();
    //     }
    //     if ((e.detail.info.trigger = TRIGGERS.DRAGGED_OVER_INDEX)) {
    //         if (isFreeLayout) {
    //             setXY(e);
    //         }
    //     }
    //     children = e.detail.items;
    // }

    // function handleDndFinalize(e) {
    //     let setUndo = e.srcElement == $dragContainerSource; //last event to fire is this one
    //     if (isFreeLayout) setXY(e);

    //     let tool = e.detail.items.find((c) => c.tool);

    //     children = e.detail.items.map((i) => {
    //         i.tool = undefined;
    //         return i;
    //     });
    //     layoutData.children = children;

    //     if (setUndo) finishUpdateComponent();

    //     if (tool) selectComponent(tool.id);
    // }

    // function setXY(e) {
    //     let item = e.detail.items.find((c) => c.id == e.detail.info.id);
    //     if (item != null) {
    //         if (item.options.style == null) item.options.style = {};

    //         let w = item.options.style.width
    //             ? parseInt(item.options.style.width.replace(/px|%/, ""))
    //             : 100;
    //         let h = item.options.style.height
    //             ? parseInt(item.options.style.height.replace(/px|%/, ""))
    //             : 50;
    //         item.options.style.left = mouseX - w / 2 + "px";
    //         item.options.style.top = mouseY - h / 2 + "px";
    //     }
    // }

    // function handleMouseDown(e) {
    //     if (!$editMode) return;
    //     if (e.target == containerElem)
    //         selectComponent(layoutData.id, e.ctrlKey);
    // }

    // function handleMouseMove(e) {
    //     if (isFreeLayout) {
    //         mouseX = e.clientX - containerElem.getBoundingClientRect().left;
    //         mouseY = e.clientY - containerElem.getBoundingClientRect().top;
    //     }
    // }

    const flipDurationMs = 100;

    let { comp } = $props();
    let isFreeLayout = $derived(comp.options.layout == layoutTypes.FREE);
    let directOver = $state(false);
    let containerDiv;
</script>

<!-- <section
    bind:this={containerElem}
    use:dndzone={{
        items: children,
        flipDurationMs,
        dragDisabled: !$editMode,
        centreDraggedOnCursor: true,
        dropTargetClasses: ["dnd-dragging"],
        dropTargetStyle: {},
    }}
    on:click={handleMouseDown}
    on:mousemove={(e) =>
        (directOver = e.target == containerElem ? "direct-over" : "")}
    on:mouseleave={(e) => (directOver = "")}
    on:consider={handleDndConsider}
    on:finalize={handleDndFinalize}
    class="{$$restProps.class || ''} ui-container layout-{layoutData.options
        .layout} {$editMode ? 'editing' : ''} {directOver}"
    style={css}
> -->

<div
    bind:this={containerDiv}
    role="region"
    aria-label="Container"
    class="ui-container layout-{comp.options.layout}"
    class:editing={editorState.editMode}
    class:direct-over={directOver}
    onmousemove={(e) => (directOver = e.target == containerDiv)}
    onmouseleave={(e) => (directOver = false)}
    onclick={(e) => {
        if (directOver) {
            if (e.ctrlKey) editorState.selectedComponents.push(comp);
            else editorState.selectedComponents = [comp];
        } 
    }}
>
    {#if comp.children}
        {#each comp.children as item (item.id)}
            <div
                class="comp-wrapper"
                style="{isFreeLayout && item.options?.style?.left
                    ? '--left:' + item.options.style.left + ';'
                    : ''}
                    {isFreeLayout && item.options?.style?.top
                    ? '--top:' + item.options.style.top + ';'
                    : ''}
                    {isFreeLayout && item.options?.style?.width
                    ? '--width:' + item.options.style.width + ';'
                    : ''}
                    {isFreeLayout && item.options?.style?.height
                    ? '--height:' + item.options.style.height + ';'
                    : ''}
                    {!isFreeLayout && item.options?.style?.size
                    ? '--size:' + item.options.style.size + ';'
                    : ''}
                    {!isFreeLayout && item.options?.style?.shrink
                    ? '--shrink:' + item.options.style.shrink + ';'
                    : ''}"
                animate:flip={{ duration: flipDurationMs }}
            >
                <UIComponent comp={item} parentComp={comp} />
            </div>
        {/each}
    {/if}
</div>

<!--</section>-->

<!-- <svelte:window on:mousemove={handleMouseMove} /> -->

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

    /* .ui-container.dnd-dragging {
        gap: calc(var(--gap, 5px) + 10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 20px;
    } */

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

    .comp-wrapper {
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
