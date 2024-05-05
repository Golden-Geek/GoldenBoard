<script>
    import { onMount } from "svelte";
    import { editMode, selectComponent, selectedComponents } from "../store";
    import Container from "./containers/Container.svelte";
    import { v4 as uuidv4 } from "uuid";

    export let layoutData;
    let comp;

    if (layoutData.id == null)
        console.warn("UIComponent", "No id provided for component");

    function sendValueCallback(value = null) {
        // console.log("sendValueCallback", value);

        comp.valueUpdated(value);
    }

    let css = "";
    $: container = layoutData.type == Container;
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
    class="ui-component-wrapper"
    class:editing
    class:selected
    class:container
    style={css}
>
    <svelte:component
        this={layoutData.type}
        class="ui-component"
        bind:this={comp}
        bind:layoutData
        sendValueFunc={(val) => sendValueCallback(val)}
    />

    <div
        class="edit-overlay"
        on:click={(e) => selectComponent(layoutData.id, e.ctrlKey)}
    >
        {layoutData.label}
    </div>
</div>

<style>
    /* ui-component sets the dimensions, svelte:component should take the whole size and  edit overlay should be on top of it with the same size */
    .ui-component-wrapper {
        --x: initial;
        --y: initial;
        --width: initial;
        --height: initial;
        --size: initial;
        --shrink: initial;

        border: 1px solid rgba(155, 15, 125, 0.4);

        top: var(--y, 0);
        left: var(--x, 0);
        width: var(--width, 100%);
        height: var(--height, 100%);

        flex-basis: var(--size, initial);
        flex-shrink: var(--shrink, initial);

        display: flex;
        justify-content: center;
        align-items: center;

        position: relative;

        box-sizing: border-box;
    }

    .ui-component-wrapper.editing {
        resize: both;
        overflow: auto;
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
        border: solid 1px red;
    }

    .ui-component-wrapper.container.editing > .edit-overlay {
        display: none;
    }

    .ui-component-wrapper.selected > .edit-overlay {
        border: solid 1px rgb(0, 255, 89);
    }

    .ui-component-wrapper.editing > .edit-overlay:hover {
        border: solid 1px rgb(255, 255, 0);
        background-color: rgba(255, 145, 0, 0.1);
    }

    .ui-component-wrapper.editing.selected > .edit-overlay:hover {
        background-color: rgba(0, 255, 34, 0.1);
    }

    .ui-component-wrapper.container.selected > .edit-overlay {
        border-color: rgba(225, 18, 156, 0.879);
        background-color: rgba(141, 9, 97, 0.1);
        display:block;
    }
</style>
