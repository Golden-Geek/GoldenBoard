<script>
    import { componentTypes, propertyEditors } from "$lib/editor/editor.svelte";
    import PropertyEditor from "./PropertyEditor.svelte";

    let { name, parent, properties } = $props();
</script>

<div class="prop-container">
    <div class="title">{name}</div>
    {#each Object.entries(properties) as [key, value]}
        {#if value.type}
            <PropertyEditor name={key} {parent} property={value} />
        {:else}
            <svelte:self name={key} parent={parent[key]} properties={value} />
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
