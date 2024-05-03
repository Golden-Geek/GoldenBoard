<script>
    import { editMode } from "../store";

    export let options;
    let comp;

    function sendValueCallback(value = null) {
        console.log("sendValueCallback", value);

        comp.valueUpdated(value);
    }
</script>

<div class="ui-component-wrapper {$editMode ? 'editing' : ''}">
    <svelte:component
        this={options.type}
        class="ui-component"
        bind:this={comp}
        {options}
        sendValueFunc={(val) => sendValueCallback(val)}
    />
    <div class="edit-overlay">
        {options.label}
    </div>
</div>

<style>
    /* ui-component sets the dimensions, svelte:component should take the whole size and  edit overlay should be on top of it with the same size */
    .ui-component-wrapper {
        position: relative;
        width: 100px;
        height: 100px;
        margin: 10px;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    :global(.ui-component-wrapper.editing) {
        resize: both;
        overflow: auto;
    }

    :global(.ui-component-wrapper .ui-component) {
        filter: blur(0px);
        transition: filter 0.3s;
    }

    :global(.ui-component-wrapper.editing .ui-component) {
        filter: blur(2px);
    }

    :global(.ui-component) {
        width: 100%;
        height: 100%;
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
        opacity:0;
        animation: visibility 1s;
    }

    .editing .edit-overlay {
        visibility: visible;
        opacity:1;
        animation: visibility 1s, opacity 1s ;
    }
</style>
