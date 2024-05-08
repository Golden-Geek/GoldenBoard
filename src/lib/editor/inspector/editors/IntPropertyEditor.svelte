<script>
    import { finishUpdateComponent, startUpdateComponent, undo } from "$lib/editor/store";

    export let property;
    export let propertyName;
    export let compPropParent;
    
    export let value = parseInt(compPropParent[propertyName] || property.default);
    console.log(compPropParent, propertyName, property);


    function handleStartEditing() {
        startUpdateComponent();
    }

    function handleEndEditing() {
        compPropParent[propertyName] = value+"px";
        finishUpdateComponent();
    }

</script>
<input type="number" bind:value={value}
    on:focus={() => handleStartEditing()}
    on:blur={() => handleEndEditing()}
    on:mouseup={() => handleEndEditing()}
/>
