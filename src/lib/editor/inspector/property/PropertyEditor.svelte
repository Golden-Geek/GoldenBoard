<script>
    import { propertyEditors } from "$lib/editor/editor.svelte";

    let { name, parent, property } = $props();

    let PropEditor = propertyEditors[property.type];
</script>

<div class="property-editor">
    <span class="propname"> {name}</span>
    <div class="propedit"><PropEditor {parent} {property} {name} /></div>
</div>

<style>
    .property-editor {
        display: flex;
        flex-direction: row;
        align-items: center;
        margin: 0.5em 0;
    }

    .propname {
        font-weight: bold;
        margin-right: 0.5em;
        flex-basis: 100px;
    }

    .propedit {
        flex-grow: 1;
        display:flex;
        gap: 0.5em;
    }
</style>
