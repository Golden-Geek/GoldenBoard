<script>
    import { onMount } from "svelte";
    import UIComponent from "../UIComponent.svelte";
    import { Layouts, editMode } from "$lib/editor/store";
    export let layoutData = {};

    onMount(() => {
        // console.log("Container mounted", layoutData.options?.label);
    });

    let css = "";

    if (layoutData.options?.style) {
        css =
            Object.entries(layoutData.options?.style)
                .map(([key, value]) => `--${key}:${value}`)
                .join(";") + ";";
    } else {
    }

    if (layoutData.options?.customCSS) css += layoutData.options.customCSS;

    let hasResizer = layoutData.options?.layout == Layouts.HORIZONTAL || layoutData.options?.layout == Layouts.VERTICAL;
</script>

<div
    class="ui-container layout-{layoutData.options?.layout || 'free'} {$editMode?"editing":""}"
    style={css}
>
    {#if layoutData.children}
        {#each layoutData.children as child, index}
        {#if hasResizer && index > 0}
        <div class="layout-resizer" />
        {/if}

            <UIComponent layoutData={child} />
        {/each}
    {/if}
</div>

<style>
    .ui-container {
        /* Common container styles */
        --gap: initial;

        background-color: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.2);
        position: relative;
        padding: 5px;
        width: 100%;
        height: 100%;
        gap: var(--gap, 5px);
        box-sizing: border-box;
    }

    .ui-container.editing
    {
        gap: calc(var(--gap, 5px) - 5px);
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
        --grid-column-count: 2;
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

    .layout-resizer
    {
        background-color: rgba(255, 255, 255, 0.2);
        width: 5px;
        height: 5px;
        flex:0 0 2epx;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: auto;
        display:none;
    }

    .ui-container.editing > .layout-resizer
    {
        display: flex;
    }

    .layout-horizontal > .layout-resizer
    {
        height:30%;
        cursor: ew-resize;
    }

    .layout-vertical > .layout-resizer
    {
        width:30%;
        cursor: ns-resize;
    }

</style>
