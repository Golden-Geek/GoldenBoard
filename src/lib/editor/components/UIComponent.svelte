<script>
    import { onMount } from "svelte";
    import {
        ComponentTypes,
        editMode,
        selectComponent,
        selectedComponents,
    } from "../store";
    import Container from "./containers/Container.svelte";
    import { v4 as uuidv4 } from "uuid";
    import { flip } from "svelte/animate";

    export let isMain = false;
    export let layoutData;
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

    if (layoutData.options?.style) {
        css =
            Object.entries(layoutData.options?.style)
                .map(([key, value]) => `--${key}:${value}`)
                .join(";") + ";";
    } else {
    }

    if (layoutData.options?.customCSS) css += layoutData.options.customCSS;
</script>

<div
    class="ui-component-wrapper {isMain?'main':''}"
    class:editing
    class:selected
    class:container
    style={css}
>
    <svelte:component
        bind:this={comp}
        this={compType.type}
        class="ui-component"
        {layoutData}
        sendValueFunc={(val) => sendValueCallback(val)}
    />

    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="edit-overlay"
        on:click={(e) => selectComponent(layoutData.id, e.ctrlKey)} >
    </div>
</div>

<style>
    /* ui-component sets the dimensions, svelte:component should take the whole size and  edit overlay should be on top of it with the same size */
    .ui-component-wrapper {
        width:100%;
        height:100%;

        display: flex;
        justify-content: center;
        align-items: center;

        position: relative;

        box-sizing: border-box;
        user-select: none;

        transition:padding 0.3s ease;
    }

    .ui-component-wrapper.editing.main
    {
        padding:20px;
    }

    .ui-component-wrapper.editing {
        /* resize: both; */
        /* overflow: auto;e */
        /* padding:10px; */
    }

    .edit-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.05);
        justify-content: center;
        align-items: center;
        display: none;
        font-size: 2em;
        box-sizing: border-box;
    }

    .ui-component-wrapper.editing > .edit-overlay {
        display: block;
        /* border: solid 1px red; */
    }

    .ui-component-wrapper.container.editing > .edit-overlay {
        display: none;
    }

    .ui-component-wrapper.selected > .edit-overlay {
        border: solid 1px rgb(0, 255, 89);
    }

    .ui-component-wrapper.editing > .edit-overlay:hover {
        border: solid 1px rgba(255, 0, 183, 0.777);
        background-color: rgba(209, 36, 177, 0.195);
    }

    .ui-component-wrapper.editing.selected > .edit-overlay:hover {
        background-color: rgba(0, 255, 34, 0.1);
    }

    .ui-component-wrapper.container.selected > .edit-overlay {
        /* border-color: rgba(225, 18, 156, 0.879);e */
        background-color: rgba(141, 9, 97, 0.1);
        display: block;
    }
</style>
