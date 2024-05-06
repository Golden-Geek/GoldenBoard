<script>
    import { onMount } from "svelte";
    import UIComponent from "../UIComponent.svelte";
    import { Layouts, editMode } from "$lib/editor/store";
    import { flip } from "svelte/animate";
    import {
        dndzone,
        SHADOW_ITEM_MARKER_PROPERTY_NAME,
        TRIGGERS,
    } from "svelte-dnd-action";

    export let sendValueFunc;
    export let layoutData;
    let containerElem;

    let children = layoutData.children;
    let isFreeLayout = layoutData.options?.layout == Layouts.FREE;

    let css = "";
    const flipDurationMs = 300;

    let mouseX = 0,
        mouseY = 0;

    if (layoutData.options?.style) {
        css =
            Object.entries(layoutData.options?.style)
                .map(([key, value]) => `--${key}:${value}`)
                .join(";") + ";";
    } else {
    }

    if (layoutData.options?.customCSS) css += layoutData.options.customCSS;

    let hasResizer = false;
    // layoutData.options?.layout == Layouts.HORIZONTAL ||
    // layoutData.options?.layout == Layouts.VERTICAL;

    function handleDndConsider(e) {
        if ((e.detail.info.trigger = "draggedOverIndex")) {
            if (isFreeLayout) {
                setXY(e);
            }
        }
        children = e.detail.items;
    }

    function handleDndFinalize(e) {
        setXY(e);
        children = e.detail.items;
        layoutData.children = children;
    }

    function setXY(e) {
        let item = e.detail.items.find((c) => c.id == e.detail.info.id);
        if (item != null) {
            if (item.options.style == null) item.options.style = {};

            let w = item.options.style.width ? parseInt(item.options.style.width.replace(/px|%/,'')) : 100;
            let h = item.options.style.height ? parseInt(item.options.style.height.replace(/px|%/,'')) : 50;
            item.options.style.left = mouseX - w / 2 + "px";
            item.options.style.top = mouseY - h / 2 + "px";
        }
    }

    function handleMouseMove(e) {
        if (isFreeLayout) {
            mouseX = e.clientX - containerElem.getBoundingClientRect().left;
            mouseY = e.clientY - containerElem.getBoundingClientRect().top;
        }
    }
</script>

<section
    bind:this={containerElem}
    use:dndzone={{
        items: children,
        flipDurationMs,
        dragDisabled: !$editMode,
        centreDraggedOnCursor: true,
    }}
    on:consider={handleDndConsider}
    on:finalize={handleDndFinalize}
    class="{$$restProps.class || ''} ui-container layout-{layoutData.options
        ?.layout || 'free'} {$editMode ? 'editing' : ''}"
    style={css}
>
    {#if layoutData.children}
        {#each children as item (item.id)}
            <div
                class="dnd-wrapper"
               
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
                <UIComponent layoutData={item} />
            </div>
        {/each}
    {/if}
</section>

<svelte:window on:mousemove={handleMouseMove} />

<style>
    .ui-container {
        /* Common container styles */
        --gap: initial;

        background-color: rgba(255, 255, 255, 0.05);
        /* border: 1px solid rgba(255, 255, 255, 0.2); */
        position: relative;
        padding: 5px;
        width: 100%;
        height: 100%;
        gap: var(--gap, 5px);
        box-sizing: border-box;
        cursor: initial;
        transition:
            padding 0.3s ease,
            ease,
            gap 0.3s ease;
    }
    e .ui-container.editing {
        gap: calc(var(--gap, 5px) + 10px);
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
        --grid-layout-gap: var(--gap, 10px);
        --grid-column-count: 4;
        --grid-item--min-width: 100px;

        --gap-count: calc(var(--grid-column-count) - 1);
        --total-gap-width: calc(var(--gap-count) * var(--grid-layout-gap));
        --grid-item--max-width: calc(
            (100% - var(--total-gap-width)) / var(--grid-column-count)
        );

        display: grid;
        grid-template-columns: repeat(
            auto-fill,
            minmax(
                max(var(--grid-item--min-width), var(--grid-item--max-width)),
                1fr
            )
        );
        grid-gap: var(--grid-layout-gap);
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

    /* .layout-resizer {
        background-color: rgba(255, 255, 255, 0.2);
        width: 5px;
        height: 5px;
        flex: 0 0 2epx;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: auto;
        display: none;
    } */

    /* .ui-container.editing > .layout-resizer {
        display: flex;
    }

    .layout-horizontal > .layout-resizer {
        height: 30%;
        cursor: ew-resize;
    }

    .layout-vertical > .layout-resizer {
        width: 30%;
        cursor: ns-resize;
    } */
</style>
