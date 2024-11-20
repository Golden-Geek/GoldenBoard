<script>
    import { componentTypes, editorState } from "$lib/editor/editor.svelte.js";
    import PropertyEditor from "./property/PropertyEditor.svelte";
    import PropertyEditorContainer from "./property/PropertyEditorContainer.svelte";

    let comp = $derived(editorState.selectedComponents[0]);
    let editingLabel = $state(false);

    $effect(() => {
        if (comp?.options?.label && editingLabel) {
            const labelElement = document.querySelector(".comp-label");
            if (labelElement) {
                labelElement.contentEditable = true;
                labelElement.focus();
                labelElement.addEventListener("blur", () => {
                    comp.options.label = labelElement.textContent;
                    editingLabel = false;
                    labelElement.contentEditable = false;
                });
            }
        }
    });
</script>

<div
    class="inspector"
    class:editing={editorState.editMode && editorState.inspectorOpen}
    class:hidden={!editorState.editMode || !editorState.inspectorOpen}
>
    <h1>Inspector</h1>

    {#if comp != null}
        <p class="comp-header">
            <span class="comp-label">{comp.options?.label || comp.id}</span>
            <span
                class="comp-label-edit"
                onclick={(editingLabel = !editingLabel)}>🖍️</span
            >

            {#if comp.type != "container"}
                <div class="comp-type-swap">
                    <select bind:value={comp.type}>
                        {#each Object.keys(componentTypes) as type}
                            {#if type != "container"}
                                <option value={type}>{type}</option>
                            {/if}
                        {/each}
                    </select>
                </div>
            {/if}
        </p>
        <div class="inspector-content">
            <div class="main-props">
                <PropertyEditor
                    name="id"
                    {comp}
                    property={{
                        type: "string",
                    }}
                />

                {#key comp}
                    {#if comp.options}
                        <PropertyEditorContainer
                            name="Options"
                            comp={comp.options}
                            properties={componentTypes[comp.type].options}
                        />
                    {/if}
                {/key}
            </div>
        </div>

        <div class="inspector-debug">
            <div class="debug-content">
                <pre>{JSON.stringify(comp, null, 2)}</pre>
            </div>
        </div>
    {/if}
</div>

<style>
    .inspector {
        height: 100%;
        color: #ccc;
        overflow-x: hidden;
        background-color: #333;
        box-shadow: -10px 0 10px rgba(0, 0, 0, 0.3);
        flex: 0 0 0px;
        transition: flex-basis 0.3s ease;
        flex-direction: column;
        display: flex;
        overflow-y: hidden;
    }

    .inspector.overlay {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.5);
    }

    .inspector.editing {
        position: relative;
        flex-basis: 400px;
    }

    h1 {
        text-align: center;
    }

    .comp-header {
        text-align: center;
    }

    .comp-label {
        padding: 0 1em;
    }
    .comp-label:focus-visible {
        background-color: #202020;
        color: #ccc;
        outline: 1px solid #575757;
        border-radius: 3px;
    }

    .comp-label-edit {
        cursor: pointer;
    }

    .comp-type-swap {
        margin-left: 1em;
        display: inline-block;
        text-align: center;
    }

    .inspector .inspector-content {
        box-sizing: border-box;
        width: 400px;
        font-size: 0.8em;
        padding: 10px;
    }

    .inspector-debug {
        margin-top: 1em;
        background-color: #151515;
        border-top: #4a4a4a solid 1px;
        overflow: hidden;
        box-sizing: border-box;
        display: flex;
        flex-grow: 1;
    }

    .debug-content {
        padding: 0 20px;
        width: 100%;
        height: 100%;
        overflow-y: auto;
        /* box-sizing: border-box; */
    }
</style>
