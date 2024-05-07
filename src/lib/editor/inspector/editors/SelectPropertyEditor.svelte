<script>
    import {
        finishUpdateComponent,
        selectComponent,
        selectedComponents,
        startUpdateComponent,
    } from "$lib/editor/store";

    export let property;
    export let propertyName;

    export let compPropParent;

    export let value = compPropParent[propertyName];

    function handleChange(val)
    {
        startUpdateComponent();
        compPropParent[propertyName] = val.target.value;
        finishUpdateComponent();
    }
</script>

<select
    bind:value
    on:change={handleChange}
>
    {#each property.options as option}
        <option value={option}>{option}</option>
    {/each}
</select>

<style>
    select {
        width: 100%;
        height: 100%;
        padding: 0;
        margin: 0;
        border: solid 1px #ccc;
    }
</style>
