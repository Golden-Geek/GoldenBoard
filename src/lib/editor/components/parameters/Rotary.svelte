<!-- <script>
    import { editMode } from "$lib/editor/store";

    export let sendValueFunc;
    export let layoutData;

    export function valueUpdated(value) {
        // console.log("valueUpdated", value);
    }


    $: console.log("Rotary", $$restProps.value);

    // console.log("Rotary", $$restProps.value);

</script>

<div class="{$$restProps.class || ''} rotary">
    <div class="rotary-button" style="width: 100px; height: 100px; border-radius: 50%; background: #333; box-shadow: 0 0 5px rgba(0, 0, 0, 0.5); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s ease-out;" on:click={event => sendValueFunc(!$$restProps.value)}>
        <div style="color: #ccc; font-size: 0.8em;">{layoutData.options.label}</div>
    </div>
    <div style="margin-top: 10px; color: #ccc; font-size: 0.8em;">{layoutData.options.label}</div>
    
</div>

<style>
    .rotary {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .rotary-button:hover {
        background-color: #6b6b6b;
    }
    .rotary-button:active {
        background-color: #34b661;
    }
</style> -->
