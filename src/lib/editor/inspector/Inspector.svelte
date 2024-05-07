<script>
    import {
        ComponentTypes,
        editMode,
        inspectorOpen,
        selectedComponents,
    } from "$lib/editor/store";
    import { layout, getComponentWithId } from "$lib/editor/store";
    import { onMount } from "svelte";
    import { onDestroy } from "svelte";
    import PropertyEditor from "./PropertyEditor.svelte";
    import PropertyEditorContainer from "./PropertyEditorContainer.svelte";

    let inspector;
    let components = [];

    selectedComponents.subscribe((value) => {
        updateSelectedComponents(value);
    });

    function updateSelectedComponents(value) {
        if (value.length == 0) {
            components = [];
            return;
        }

        components = value.map((id) => {
            return getComponentWithId($layout.main, id);
        });
    }

    onMount(() => {
        layout.subscribe((value) => {
            updateSelectedComponents($selectedComponents);
        });
    });
</script>

<div
    bind:this={inspector}
    class="inspector {$editMode && $inspectorOpen ? 'editing' : 'hidden'}"
>
    {#key $layout}
        <div class="inspector-content">
            <h1>
                {components.length > 0
                    ? components.map((comp) => {
                          return comp.options?.label;
                      })
                    : "No Item selected"}
            </h1>
            {#if components.length > 0}
                {#each components as comp}
                    <div class="main-props">
                        <h2>Properties</h2>
                        <PropertyEditor
                            bind:compPropParent={comp}
                            propertyName="id"
                            property={{ type: "string" }}
                        />

                        <PropertyEditorContainer
                            compPropParent={comp.options}
                            name="Options"
                            propertyContainer={ComponentTypes[comp.type]
                                .options}
                        />
                    </div>
                    <hr />
                {/each}
            {/if}
            <pre>{JSON.stringify($layout, null, 2)}</pre>
        </div>
    {/key}
</div>

<style>
    .inspector {
        height: 100%;
        color: #ccc;
        overflow-x: hidden;
        background-color: #333;
        /* transform: translateX(100%); */
        box-shadow: -10px 0 10px rgba(0, 0, 0, 0.3);
        flex: 0 0 0px;
        transition: flex-basis 0.3s ease;
    }

    .inspector.overlay {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.5);
    }

    .inspector.editing {
        position: relative;
        flex-basis: 400px;
    }

    .inspector .inspector-content {
        padding: 10px;
        box-sizing: border-box;
        width: 400px;
        height: 100%;
    }

    h1 {
        font-size: 1.5em;
        margin: 0 0 10px 0;
    }

    pre {
        white-space: pre-wrap;
    }
</style>
