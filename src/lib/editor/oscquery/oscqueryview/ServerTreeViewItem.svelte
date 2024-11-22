<script>
    import { slide } from "svelte/transition";

    let { node } = $props();

    let expanded = $state(true);
    let isContainer = node.CONTENTS != null;

    let icon;

    switch(node.TYPE)
    {
        case "I":
        case "N":
            icon = "⚡";
            break;

        case "i":
            icon = "🎚️";
            break;

        case "f":
            icon = "🎚️";
            break;

        case "s":
            icon = "🔤";
            break;

        case "T":
        case "F":
            icon = "☑️";
            break;

        case "r":
            icon = "🎨";
            break;

        case "ff":
            icon = "⌗";
            break;
        
        case "fff":
            icon = "🧊";
            break;
            
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
        <ul transition:slide={{ duration: 200 }}>
            {#each Object.entries(node.CONTENTS) as n}
                <li>
                    <svelte:self node={n[1]} />
                </li>
            {/each}
        </ul>
    {/if}
{/if}

<style>
    ul {
        list-style-type: none;
        padding-left: 0;
    }

    li {
        margin: 3px 0;
        padding-left: 20px;
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
