<script>
    import { componentTypes, propertyEditors } from "$lib/editor/editor.svelte";
    import PropertyEditor from "./PropertyEditor.svelte";

    let { name, comp, properties } = $props();

    //sanitize
    Object.entries(properties).forEach(([key, value]) => {
        if (!value.type && !comp[key])  comp[key] = {};
    });
</script>

<div class="prop-container">
    <div class="title">{name}</div>
    {#each Object.entries(properties) as [key, value]}
        {#if value.type}
            <PropertyEditor name={key} {comp} property={value} />
        {:else if comp[key]}
            <svelte:self name={key} comp={comp[key]} properties={value} />
        {/if}
    {/each}
</div>

<style>
    .prop-container {
        padding: 5px;
        border: 1px solid #555;
    }

    .title {
        color: #888;
    }
</style>
