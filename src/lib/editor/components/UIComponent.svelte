<script>
    import { onMount } from "svelte";
    import {
        ComponentTypes,
        Layouts,
        editMode,
        finishUpdateComponent,
        layout,
        selectComponent,
        selectedComponents,
        startUpdateComponent,
    } from "../store";
    import Container from "./containers/Container.svelte";

    export let isMain = false;
    export let layoutData;
    export let parentLayout = null;

    let wrapper;
    let comp;

    if (layoutData.id == null)
        console.warn("UIComponent", "No id provided for component");

    function sendValueCallback(value = null) {
        comp.valueUpdated(value);
    }

    let css = "";
    let compType = ComponentTypes[layoutData.type];
    $: container = compType?.type == Container;
    $: selected = $selectedComponents.includes(layoutData.id);
    $: editing = $editMode;

    let resizing = false;

    if (!layoutData.children) layoutData.children = [];
    if (!layoutData.options) layoutData.options = {};
    if(!layoutData.options.style) layoutData.options.style = layoutData.options.style = {};

    css =
        Object.entries(layoutData.options.style)
            .map(([key, value]) => `--${key}:${value}`)
            .join(";") + ";";
   
    if (layoutData.options?.customCSS) css += layoutData.options.customCSS;

    let observer = new ResizeObserver(function (entries) {
        if (entries[0].target == wrapper) {
            layoutData.options.style.width =
                entries[0].contentRect.width + "px";
            layoutData.options.style.height =
                entries[0].contentRect.height + "px";
        }
    });

    function handleMouseDown(e) {
        if (!$editMode) return;
        if (e.target == wrapper) {
            resizing = true;
            observer.observe(wrapper);
            startUpdateComponent();
            e.stopPropagation();
        }
    }

    function handleMouseUp(e) {
        if (resizing) {
            resizing = false;
            observer.unobserve(wrapper);
            finishUpdateComponent();
        }
    }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    bind:this={wrapper}
    class="ui-component-wrapper {isMain ? 'main' : ''} {parentLayout ==
    Layouts.FREE
        ? 'resizable'
        : ''}"
    class:editing
    class:selected
    class:container
    style={css}
    on:mousedown={handleMouseDown}
    on:mouseup={handleMouseUp}
>
    <svelte:component
        this={compType.type}
        bind:this={comp}
        class="ui-component"
        {layoutData}
        sendValueFunc={(val) => sendValueCallback(val)}
    />

    {#if $editMode && !container}
        <div
            class="edit-overlay"
            on:click={(e) => selectComponent(layoutData.id, e.ctrlKey)}
        ></div>
    {/if}
</div>

<style>
    /* ui-component sets the dimensions, svelte:component should take the whole size and  edit overlay should be on top of it with the same size */
    .ui-component-wrapper {
        width: 100%;
        height: 100%;

        display: flex;
        justify-content: center;
        align-items: center;

        position: relative;

        box-sizing: border-box;
        user-select: none;

        transition:
            transform 1s ease,
            padding 0.3s ease,
            border 0.2s ease;
    }

    .edit-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        justify-content: center;
        align-items: center;
        display: block;
        font-size: 2em;
        box-sizing: border-box;
    }

    /* editing */
    .ui-component-wrapper.editing {
        border: solid 1px rgba(255, 255, 255, 0.1);
    }

    .ui-component-wrapper.editing.selected {
        border: solid 1px rgba(42, 210, 23, 0.447);
    }

    .ui-component-wrapper.editing:not(.container):hover,
    :global(
            .ui-component-wrapper.editing.container:has(
                    > .ui-container.direct-over
                )
        ) {
        border: solid 1px rgba(216, 168, 11, 0.719) !important;
    }

    .ui-component-wrapper.editing.resizable {
        resize: both;
        overflow: hidden;
    }

    .edit-overlay {
        /* transition: background-color 0.2s ease; */
    }

    .ui-component-wrapper.editing:hover > .edit-overlay {
        background-color: rgba(255, 255, 255, 0.05);
    }

    /*
    .ui-component-wrapper.editing:hover > .edit-overlay {
        outline: solid 1px rgba(255, 0, 183, 0.777);
        background-color: rgba(209, 36, 177, 0.195);
    }

    .ui-component-wrapper.editing:hover{
        outline: solid 1px rgba(255, 0, 183, 0.3);
    }

    .ui-component-wrapper.editing.selected > .edit-overlay {
        outline: solid 1px rgb(0, 255, 89);
    }

    .ui-component-wrapper.editing.selected:hover > .edit-overlay {
        background-color: rgba(0, 255, 34, 0.1);
    } */
</style>
