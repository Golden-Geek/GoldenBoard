<script>
    import { editMode } from "$lib/editor/store";


    export let sendValueFunc;
    export let options;

    export function valueUpdated(value)
    {
        console.log("valueUpdated", value);
    }

</script>

<!-- slider -->
<input type="range" class="{$$restProps.class || ''}" disabled="{$editMode}" min="0.1" max="1.2" step="0.0001" on:input={e => sendValueFunc(e.target.value)} />

<style>
    
    /* cool dark theme slider with round corners, shadows and hover behaviour*/
    input[type=range] {
        -webkit-appearance: none;
        width:100%;
        height: 10px;
        border-radius: 5px;
        background: #333;
        outline: none;
        opacity: 0.7;
        -webkit-transition: .2s;
        transition: opacity .2s;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
    }

    input[type=range]:not([disabled]):hover {
        opacity: 1;
    }

    input[type=range]:not([disabled])::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ccc;
        cursor: pointer;
    }


</style>