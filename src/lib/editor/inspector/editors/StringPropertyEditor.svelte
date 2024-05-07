<script>
    import { finishUpdateComponent, startUpdateComponent, undo } from "$lib/editor/store";

    export let property;
    export let propertyName;
    export let compPropParent;
    

    function handleStartEditing() {
        startUpdateComponent();
    }

    function handleEndEditing() {
        finishUpdateComponent();
    }

</script>

<input type="text" bind:value={compPropParent[propertyName]}
    on:focus={() => handleStartEditing()}
    on:blur={() => handleEndEditing()}
/>
