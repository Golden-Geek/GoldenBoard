<script context="module">
    // retain module scoped expansion state for each tree node
    let expansionState = $state({});
</script>

<script>
    import { slide } from "svelte/transition";
    import { componentTypes, editorState } from "../editor.svelte";

    let { data } = $props();

    let label = $derived(
        data.options?.label ? data.options.label : "[" + data.id + "]",
    );
    let expanded = $state(expansionState[label] || true);
    let selected = $derived(editorState.selectedComponents.includes(data));
    let icon = $derived(componentTypes[data.type].icon);
</script>

<ul>
    <!-- transition:slide -->
    <li>
        <span>
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
                {#each data.children as child}
                    <svelte:self data={child} />
                {/each}
            {/if}
        </span>
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
