<script>
    import { PropertyEditorTypes } from "../store";

    export let compPropParent;
    export let propertyName;
    export let property;
    
</script>

<div class="property-editor">
    <span class="propname">
        {propertyName} :
    </span>
    <div class="propedit">

    </div><svelte:component this={PropertyEditorTypes[property.type]} bind:compPropParent bind:propertyName bind:property />
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
        flex: 1;
    }
</style>