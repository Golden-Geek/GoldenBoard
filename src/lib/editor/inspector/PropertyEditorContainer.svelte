<script>
    import PropertyEditor from "./PropertyEditor.svelte";

    export let compPropParent;
    export let propertyContainer;
    export let name;
</script>

<div class="prop-container">
    <div class="title">{name}</div>
    {#each Object.entries(propertyContainer) as [key, value]}
        {#if value.type}
             <PropertyEditor
                {compPropParent}
                propertyName={key}
                property={value}
            />
        {:else}
            <svelte:self
                name={key}
                compPropParent={compPropParent[key]}
                propertyContainer={value}
            />
        {/if}
    {/each}
</div>

<style>
    .prop-container {
        padding: 5px;
        border: 1px solid #555;
    }

    .title {
        color:rgb(168, 96, 215);
        text-align: center;
    }
</style>
