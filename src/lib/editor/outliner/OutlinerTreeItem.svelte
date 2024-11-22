<script context="module">
    // retain module scoped expansion state for each tree node
    let expansionState = $state({});
</script>

<script>
    import { slide } from "svelte/transition";
    import { componentTypes, editorState } from "../editor.svelte";
    import { dndzone } from "svelte-dnd-action";
    import { flip } from "svelte/animate";

    let { data } = $props();

    let label = $derived(
        data.options?.label ? data.options.label : "[" + data.id + "]",
    );
    let expanded = $state(expansionState[label] || true);
    let selected = $derived(editorState.selectedComponents.includes(data));
    let icon = $derived(componentTypes[data.type].icon);

    function handleDndConsider(e) {
        data.children = e.detail.items;
        // if (item === over) return false;
        // if (item.options?.label === over.options?.label) return false;
        // return true;
    }

    function handleDndFinalize(e) {
        data.children = e.detail.items;
        // if (item === over) return;
        // if (item.options?.label === over.options?.label) return;
        // let index = data.children.indexOf(item);
        // data.children.splice(index, 1);
        // data.children.splice(overIndex, 0, item);
    }
</script>

<div class="outliner-item">
    {#if data.children}
        <span
            class="arrow"
            class:expanded
            aria-expanded={expanded}
            role="button"
            tabindex="0"
            onclick={() => (expanded = !expanded)}
            onkeydown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    expanded = !expanded;
                    e.preventDefault();
                }
            }}
        >
            ▶
        </span>
    {/if}
    <span class="icon" style="margin-right: 5px;">{icon}</span>
    <span
        class="label"
        class:selected
        role="button"
        tabindex="0"
        onclick={(e) => {
            if (e.ctrlKey) editorState.selectedComponents.push(data);
            else editorState.selectedComponents = [data];
        }}
    >
        {label}
    </span>
    {#if expanded && data.children != null}
        <section
            transition:slide={{ duration: 200 }}
            class="children"
            use:dndzone={{
                items: data.children,
                flipDurationMs: 100,
                morphDisabled: true,
                dragDisabled: false,
                centreDraggedOnCursor: false,
                dropTargetClasses: ["dnd-dragging"],
                dropTargetStyle: {},
            }}
            onconsider={handleDndConsider}
            onfinalize={handleDndFinalize}
        >
            {#each data.children as child (child.id)}
                <div class="outliner-item" animate:flip={{ duration: 200 }}>
                    <svelte:self data={child} />
                </div>
            {/each}
        </section>
    {/if}
</div>

<style>
    .children {
        margin: 0;
        list-style: none;
        padding-left: 0.5rem;
        user-select: none;
        font-size: 12px;
        /* margin: 2px 0; */
    }

    span.label {
        display: inline-block;
        padding: 5px;
        border-radius: 5px;
        text-wrap: nowrap;
    }

    span.label:hover {
        filter: brightness(0.8);
        cursor: pointer;
    }

    .selected {
        background-color: #6ba33a;
        color: #222;
        transition:
            background-color 200ms,
            color 200ms;
    }

    .arrow {
        cursor: pointer;
        display: inline-block;
        align-content: center;
        vertical-align: middle;
        transition: transform 200ms;
    }

    .arrow.expanded {
        transform: rotate(90deg);
    }
</style>
