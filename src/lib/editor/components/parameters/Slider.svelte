<script>
    import { editorState } from "$lib/editor/editor.svelte";

    let { comp, parameter, classes, css, updateValue } = $props();

    let val = $state(parameter?.getValue());

    let minVal = comp.options?.minValue
        ? comp.options.minValue
        : parameter?.node.RANGE[0].MIN
          ? parameter?.node.RANGE[0].MIN
          : 0;
    let maxVal = comp.options?.maxValue
        ? comp.options.maxValue
        : parameter?.node.RANGE[0].MAX
          ? parameter?.node.RANGE[0].MAX
          : 1;

    export function setValue(value) {
        console.log("value");
        val = value;
    }
</script>

<span class="label">{comp.options?.label || comp.id}</span>
<input
    type="range"
    class={classes}
    style={css}
    disabled={editorState.editMode}
    bind:value={val}
    min={minVal}
    max={maxVal}
    step="0.0001"
    oninput={(e) => {
        updateValue(e.target.value);
    }}
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
