<script>
// @ts-nocheck

    import { editMode } from "$lib/editor/store";
    import { onMount } from "svelte";


    export let sendValueFunc;
    export let layoutData;

    export function valueUpdated(value)
    {
        // console.log("valueUpdated", value);
    }

</script>
<span class="label"> {layoutData.options.label} </span>
<input type="checkbox" class="{$$restProps.class || ''}" bind:checked={$$restProps.value} on:change={event => sendValueFunc(event.target.checked)} />

<style>
  
  .label
  {
    color: #ccc;
    font-size: 0.8em;
  }

    input[type="checkbox"] {
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #333;
        outline: none;
        transition: opacity 0.2s;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
        cursor: pointer;
        transition: background-color 0.2s ease-out;
    }

    input[type="checkbox"]:hover {
        background-color: #6b6b6b;
    }

    input[type="checkbox"]:checked {
        background: #34b661;
    }

</style>