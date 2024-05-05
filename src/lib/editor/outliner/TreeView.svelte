<script context="module">
    // retain module scoped expansion state for each tree node
    const _expansionState = {
        /* treeNodeId: expanded <boolean> */
    };
</script>

<script>
    import { selectComponent, selectedComponents } from "../store";

    //	import { slide } from 'svelte/transition'
    export let tree;
    const { id, options, children } = tree;
    const { label } = options;

    let expanded = _expansionState[label] || true;
    const toggleExpansion = () => {
        expanded = _expansionState[label] = !expanded;
    };
    $: arrowDown = expanded;
    $: selected = $selectedComponents.includes(id);

    
</script>

<ul>
    <!-- transition:slide -->
    <li>
        <span>
            {#if children}
                <span class="arrow" class:arrowDown on:click={toggleExpansion}
                    >&#x25b6</span
                >
            {/if}
            <span class="label" class:selected on:click={(e) => selectComponent(id, e.ctrlKey)}>
                {label}
            </span>
            {#if expanded}
                {#each children as child}
                    <svelte:self tree={child} />
                {/each}
            {/if}
        </span>
    </li>
</ul>

<style>
    ul {
        margin: 0;
        list-style: none;
        padding-left: 1.2rem;
        user-select: none;
        margin: 2px 0;
    }

    span.label {
        display: inline-block;
        padding: 10px;
        border-radius: 5px;
    }

    span.label:hover {
        background-color: #555;
        cursor: pointer;
    }

    .selected {
        background-color: #475838;
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
