<script>
    import { onMount } from "svelte";
    import { editMode } from "../store";
    import Container from "./containers/Container.svelte";

    export let layoutData;
    let comp;

    onMount(() => {
        // console.log("UIComponent mounted", layoutData);
    });

    function sendValueCallback(value = null) {
        // console.log("sendValueCallback", value);

        comp.valueUpdated(value);
    }

    let css = "";
    let isContainer = layoutData.type == Container;

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
    class="ui-component-wrapper {$editMode && !isContainer ? 'editing' : ''}"
    style={css}
>
    <svelte:component
        this={layoutData.type}
        class="ui-component"
        bind:this={comp}
        {layoutData}
        sendValueFunc={(val) => sendValueCallback(val)}
    />

    <div class="edit-overlay">
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

        top: var(--x, 0);
        left: var(--y, 0);
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

    .ui-component-wrapper > * {
        filter: blur(0px);
    }

    :global(.ui-component-wrapper.editing > *) {
        filter: blur(1px);
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
        display: flex;
        font-size: 2em;
        visibility: hidden;
        opacity: 0;
        animation: visibility 1s;
        /* filter:blur(0px) !important; */
    }

    .ui-component-wrapper.editing > .edit-overlay {
        visibility: visible;
        opacity: 1;
        animation:
            visibility 1s,
            opacity 1s;

        
        box-sizing: border-box;
        filter: blur(0px);
    }

    .ui-component-wrapper.editing > .edit-overlay:hover
    {
        border: solid 1px red;
        background-color: rgba(255, 145, 0, 0.05);
    }
</style>
