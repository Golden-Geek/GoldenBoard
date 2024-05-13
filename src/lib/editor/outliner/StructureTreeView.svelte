<script context="module">
    // retain module scoped expansion state for each tree node
    const _expansionState = {
        /* treeNodeId: expanded <boolean> */
    };
</script>

<script>
    import { finishUpdateComponent, getComponentTypeForOSCType, getUniqueID, startUpdateComponent } from "../store";
    import { flip } from "svelte/animate";
    import {
        dndzone,
        SHADOW_ITEM_MARKER_PROPERTY_NAME,
        TRIGGERS,
    } from "svelte-dnd-action";

    //	import { slide } from 'svelte/transition'
    export let id = "root";
    export let tree;
    const {
        DESCRIPTION,
        FULL_PATH,
        ACCESS,
        CONTENTS,
        TYPE,
        VALUE,
        RANGE,
        EXTENDED_TYPE,
    } = tree;

    let expanded = _expansionState[DESCRIPTION] || true;
    const toggleExpansion = () => {
        expanded = _expansionState[DESCRIPTION] = !expanded;
    };
    $: arrowDown = expanded;

    let isContainer = CONTENTS != null;

    let controllables = [];
    let containers = [];

    generateControllablesAndContainers();

    function generateControllablesAndContainers() {
        if (CONTENTS == null) return;
        Object.entries(CONTENTS).forEach((element) => {
            if (element[1].CONTENTS != null) {
                containers.push({
                    id: getUniqueID(element[0]),
                    type: "Container",
                    tool: true,
                    options: {
                        label: element[1].DESCRIPTION,
                        linkedNode: element[1],
                    },
                });
            } else {
                let t = getComponentTypeForOSCType(element[1].TYPE);
                console.log(t);
                controllables.push({
                    id: getUniqueID(element[0]),
                    type: t,
                    tool: true,
                    options: {
                        label: element[1].DESCRIPTION,
                        linkedNode: element[1],
                    },
                });
            }
        });
    }

    function handleDndConsider(e) {
        if (e.detail.info.trigger == TRIGGERS.DRAG_STARTED) {
            console.log("drag started", e);
            startUpdateComponent();
        }
        // tools = generateTools();
    }

    function handleDndFinalize(e) {
        console.log("drag finalized", e);
        generateControllablesAndContainers();
        finishUpdateComponent();
    }
</script>

<ul>
    <!-- transition:slide -->
    <li>
        {#if isContainer}
            <span class="arrow" class:arrowDown on:click={toggleExpansion}
                >&#x25b6</span
            >
        {/if}

        <span class="label {isContainer ? 'container' : 'controllable'}">
            {DESCRIPTION}
        </span>

        {#if expanded && isContainer}
            <section
                use:dndzone={{
                    items: controllables,
                    flipDurationMs:300,
                    centreDraggedOnCursor: true,
                    dropTargetClasses: ["dnd-dragging"],
                    dropTargetStyle: {},
                    dropFromOthersDisabled: true,
                }}
                on:consider={handleDndConsider}
                on:finalize={handleDndFinalize}
                class="comptoolbox-content"
            >
                {#key controllables}
                    {#each controllables as item (item.id)}
                        <div
                            class="controllable-item"
                            animate:flip={{ duration: 300 }}
                        >
                            {item.options.label}
                        </div>
                    {/each}
                {/key}
            </section>

            {#key containers}
                {#each containers as item (item.id)}
                    <svelte:self tree={item.options.linkedNode} id={item.id} />
                {/each}
            {/key}
        {/if}
    </li>
</ul>

<style>
    ul {
        margin: 0;
        list-style: none;
        padding-left: 0.5rem;
        user-select: none;
        font-size: 12px;
        /* margin: 2px 0; */
    }

    .container
    {
        display: inline-block;
        padding: 6px;
        border-radius: 5px;
    }

    .controllable-item {
        display: block;
        padding: 6px 0px 6px 20px;
        border-radius: 5px;
        color:rgb(40, 146, 221);
    }

    .controllable-item:hover {
        background-color: #555;
        cursor: pointer;
    }

    .arrow {
        cursor: pointer;
        display: inline-block;
        font-size: 10px;
        align-content: center;
        vertical-align: middle;
        transition: transform 200ms;
    }
    .arrowDown {
        transform: rotate(90deg);
    }
</style>
