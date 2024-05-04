<script>
    import { editMode } from "$lib/editor/store";
    import { onMount } from "svelte";


    export let sendValueFunc;
    export let layoutData;

    onMount(() => {
        // console.log("Button mounted", layoutData);
    });

    export function valueUpdated(value)
    {
        // console.log("valueUpdated", value);
    }

</script>

<button class="{$$restProps.class || ''}" disabled="{$editMode}" on:click={() => sendValueFunc("trigger")}>{layoutData.options?.label}</button>

<style>
    
    /* cool dark theme button with round corners, shadows and hover behaviour*/
    button {
        background-color: #333;
        width:100%;
        height:100%;
        color: #ccc;
        border: none;
        border-radius: 4px;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
        transition: background-color 0.2s;
        user-select: none;
    }
     
    button:not([disabled]):hover {
         cursor: pointer;
    }

    button:not([disabled]):hover {
        background-color: #3a3a3a;
    }

    button:not([disabled]):active {
        box-shadow: none;
        transform: translateY(1px);
    }

</style>