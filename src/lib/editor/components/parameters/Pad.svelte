<script>
    import { editMode } from "$lib/editor/store";

    export let sendValueFunc;
    export let layoutData;

    export function valueUpdated(value) {
        // console.log("valueUpdated", value);
    }
</script>


<input
    type="range"
    class={$$restProps.class || ""}
    disabled={$editMode}
    min="{layoutData.options.minValue?layoutData.options.minValue:0}"
    max="{layoutData.options.maxValue?layoutData.options.maxValue:1}"
    step="0.0001"
    on:input={(e) => sendValueFunc(e.target.value)}
/>

<style>
    /* cool dark theme slider with round corners, shadows and hover behaviour*/
    input[type="range"] {
        appearance: none;
        width: 100%;
        height: 10px;
        border-radius: 5px;
        background: #333;
        outline: none;
        opacity: 0.7;
        transition: opacity 0.2s;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
    }

    input[type="range"]:not([disabled]):hover {
        opacity: 1;
    }

    input[type="range"]:not([disabled])::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ccc;
        cursor: pointer;
    }
</style>
