<script>
    import { componentTypes, editorState, layoutTypes } from "../editor.svelte";

    let { comp, parentComp, isMain = false } = $props();
    let selected = $derived(editorState.selectedComponents.includes(comp));
    let isContainer = $derived(comp.type == "container");
    let CompElement = $derived(componentTypes[comp.type].type);


    let css = $derived((comp.options?.style?Object.entries(comp.options?.style)?.map(([key, value]) => `--${key}:${value}`).join(";") + ";":"") +  comp.options?.customCSS || "");

    let wrapperElement;
    let parameter; //for syncing with oscquery

    // let wrapper;
    // let comp;

    // if (layoutData.id == null)
    //     console.warn("UIComponent", "No id provided for component");

    // function sendValueCallback(value = null) {
    //     if (param) param.sendValue(value);
    //     comp.valueUpdated();
    // }

    // let css = "";
    // let compType = ComponentTypes[layoutData.type];
    // $: container = compType?.type == Container;
    // $: selected = $selectedComponents.includes(layoutData.id);
    // $: editing = $editMode;

    // let resizing = false;

    // if (!layoutData.children) layoutData.children = [];
    // if (!layoutData.options) layoutData.options = {};
    // if (!layoutData.options.style)
    //     layoutData.options.style = layoutData.options.style = {};

    // let param = null;
    // if (layoutData.options?.linkedNode) {
    //     param = new Parameter(layoutData.options.linkedNode, (param, val) => {
    //         if (comp != null) {
    //             comp.valueUpdated(val);
    //         }
    //     });
    // }


    // let observer = new ResizeObserver(function (entries) {
    //     if (entries[0].target == wrapper) {
    //         layoutData.options.style.width =
    //             entries[0].contentRect.width + "px";
    //         layoutData.options.style.height =
    //             entries[0].contentRect.height + "px";
    //     }
    // });

    // function handleMouseDown(e) {
    //     if (!$editMode) return;
    //     if (e.target == wrapper) {
    //         resizing = true;
    //         observer.observe(wrapper);
    //         startUpdateComponent();
    //         e.stopPropagation();
    //     }
    // }

    // function handleMouseUp(e) {
    //     if (resizing) {
    //         resizing = false;
    //         observer.unobserve(wrapper);
    //         finishUpdateComponent();
    //     }
    // }

    // onDestroy(() => {
    //     if (param) param.unregister();
    // });
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    bind:this={wrapperElement}
    class="ui-component-wrapper {isMain ? 'main' : ''} {!isMain &&
    parentComp.layout == layoutTypes.FREE
        ? 'resizable'
        : ''}"
    class:editing={editorState.editMode}
    class:selected
    class:container={isContainer}
    style:css
>
    <CompElement class="ui-component" {comp} {parameter} />

    {#if editorState.editMode && !isContainer}
        <div
            class="edit-overlay"
            role="button"
            tabindex="0"
            onclick={(e) => {
                if (e.ctrlKey) editorState.selectedComponents.push(comp);
                else editorState.selectedComponents = [comp];
            }}
            onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    if (e.ctrlKey) editorState.selectedComponents.push(comp);
                    else editorState.selectedComponents = [comp];
                }
            }}
        ></div>
    {/if}
</div>

<style>
    /* ui-component sets the dimensions, svelte:component should take the whole size and  edit overlay should be on top of it with the same size */
    .ui-component-wrapper {
        width: 100%;
        height: 100%;

        display: flex;
        justify-content: center;
        align-items: center;

        position: relative;

        box-sizing: border-box;
        user-select: none;

        transition:
            transform 1s ease,
            padding 0.3s ease,
            border 0.2s ease;
    }

    .edit-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        justify-content: center;
        align-items: center;
        display: block;
        font-size: 2em;
        box-sizing: border-box;
    }

    /* editing */
    .ui-component-wrapper.editing {
        border: solid 1px rgba(255, 255, 255, 0.1);
    }

    .ui-component-wrapper.editing.selected {
        border: solid 1px rgba(42, 210, 23, 0.447);
    }

    .ui-component-wrapper.editing:not(.container):hover,
    :global(
            .ui-component-wrapper.editing.container:has(
                    > .ui-container.direct-over
                )
        ) {
        border: solid 1px rgba(216, 168, 11, 0.719) !important;
    }

    .ui-component-wrapper.editing.resizable {
        resize: both;
        overflow: hidden;
    }

    .edit-overlay {
        /* transition: background-color 0.2s ease; */
    }

    .ui-component-wrapper.editing:hover > .edit-overlay {
        background-color: rgba(255, 255, 255, 0.05);
    }
</style>
