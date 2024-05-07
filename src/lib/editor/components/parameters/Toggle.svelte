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

<div class="{$$restProps.class || ''}">
TOGGLE
</div>

<style>
  

</style>