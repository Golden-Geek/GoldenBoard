<script>
    import {
        ComponentTypes,
        draggingComp,
        editMode,
        selectedComponents,
    } from "$lib/editor/store";
    import { layout, getComponentWithId } from "$lib/editor/store";
    import { onMount } from "svelte";
    import { onDestroy } from "svelte";

    let comptoolbox;
</script>

<div
    bind:this={comptoolbox}
    class="comptoolbox {$editMode ? 'editing' : 'hidden'}"
>
    <div class="comptoolbox-content">
        <ul>
            {#each Object.entries(ComponentTypes) as [id, comp]}
                <li
                    on:dragenter={(e) => draggingComp.set({
                        type: "tool",
                        id: id,
                        comp: comp,
                    })}
                >
                    {comp.name}
                </li>
            {/each}
        </ul>
    </div>
</div>

<style>
    .comptoolbox {
        width: 100%;
        color: #ccc;
        overflow-x: hidden;
        background-color: #333;
        /* transform: translateX(100%); */
        box-shadow: -10px 0 10px rgba(0, 0, 0, 0.3);
        flex: 0 0 0px;
        transition: flex-basis 0.3s ease;
        font-size: 12px;
    }

    .comptoolbox.overlay {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.5);
    }

    .comptoolbox.editing {
        position: relative;
        flex-basis: 40px;
    }

    .comptoolbox .comptoolbox-content {
        height: 100%;
        padding: 10px;
        box-sizing: border-box;
        display: flex;
        justify-content: center;
    }

    .comptoolbox-content ul {
        display: flex;
        height: 100%;
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .comptoolbox-content li {
        margin-right: 10px;
        cursor: grab;
        background-color: #ccc;
        padding: 5px;
        border-radius: 5px;
        color: #333;
        user-select: none;
    }

    .comptoolbox-content li:hover {
        background-color: #999;
        color: #fff;
    }
</style>
