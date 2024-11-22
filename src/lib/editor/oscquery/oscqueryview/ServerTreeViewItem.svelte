<script>
    import {
        componentTypes,
        getComponentTypeForNode,
        getIconForNode,
    } from "$lib/editor/editor.svelte";
    import { dndzone, TRIGGERS } from "svelte-dnd-action";
    import { slide } from "svelte/transition";
    import { v4 as uuidv4 } from "uuid";

    let { node, server } = $props();

    let expanded = $state(true);
    let isContainer = node.CONTENTS != null;
    let icon = getIconForNode(node);

    let linkedComponents = $state([]);
    if (isContainer) {
        Object.entries(node.CONTENTS).forEach(([key, element]) => {
            linkedComponents.push({
                id: element.DESCRIPTION + "-" + uuidv4(),
                type: getComponentTypeForNode(element),
                options: {
                    label: element.DESCRIPTION,
                    linkedNodes: [
                        { address: element.FULL_PATH, server: server },
                    ],
                },
                node: element,
            });
        });
    }

    function handleDndConsider(e) {
        const { trigger, id } = e.detail.info;
        if (trigger == TRIGGERS.DRAG_STARTED) {
            const elem = linkedComponents.find((elem) => elem.id === id);
            const index = linkedComponents.indexOf(elem);
            const newId = elem.options.label + "-" + uuidv4();
            e.detail.items.splice(index, 1, {
                ...linkedComponents[index],
                id: newId,
            });

            linkedComponents = e.detail.items;
        }
    }

    function handleDndFinalize(e) {
        linkedComponents = e.detail.items;
    }
</script>

{#if node}
    {#if isContainer}
        <span class="arrow" class:expanded onclick={(expanded = !expanded)}
            >⮞</span
        >
    {/if}

    <span class="label">{icon} {node.DESCRIPTION}</span>

    {#if isContainer && expanded}
        <section
            class="children"
            transition:slide={{ duration: 200 }}
            use:dndzone={{
                items: linkedComponents,
                centreDraggedOnCursor: false,
                dropTargetClasses: ["dnd-dragging"],
                dropTargetStyle: {},
                morphDisabled: true,
            }}
            onconsider={handleDndConsider}
            onfinalize={handleDndFinalize}
        >
            {#key linkedComponents}
                {#each linkedComponents as n (n.id)}
                    <div class="node">
                        <svelte:self node={n.node} {server} />
                    </div>
                {/each}
            {/key}
        </section>
    {/if}
{/if}

<style>
    .children {
        list-style-type: none;
        padding: 0;
        margin: 0;
    }

    .node {
        margin: 3px 0;
        padding-left: 20px;
        display: inline-block;
    }

    .label {
        cursor: pointer;
        padding: 5px;
        border-radius: 5px;
        transition: background-color 0.1s;
        user-select: none;
    }

    .label:hover {
        background-color: rgba(21, 183, 194, 0.2);
    }

    .arrow {
        cursor: pointer;
        display: inline-block;
        font-size: 0.6em;
        padding: 5px;
        align-content: center;
        vertical-align: middle;
        transition: transform 0.2s;
    }

    .expanded {
        transform: rotate(90deg);
    }
</style>
