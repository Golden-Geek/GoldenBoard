<script>
    import { editMode, outlinerOpen } from "../store";
    import Outliner from "./Outliner.svelte";
    import StructureOutliner from "./StructureOutliner.svelte";

    let outliner;
</script>

<div
    bind:this={outliner}
    class="outliners {$editMode && $outlinerOpen ? 'open' : 'closed'}"
>
    <div class="outliners-content">
        <Outliner />
        <hr />
        <StructureOutliner />
    </div>
</div>

<style>
    .outliners {
        height: 100%;
        color: #ccc;
        overflow-x: hidden;
        background-color: #333;
        box-shadow: 10px 0 10px rgba(0, 0, 0, 0.3);
        flex: 0 0 0px;
        transition: flex-basis 0.3s ease;
        z-index: 1;
    }

    .outliners.overlay {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.5);
    }

    .outliners.open {
        position: relative;
        flex-basis: 300px;
    }

    .outliners .outliners-content {
        padding: 10px;
        box-sizing: border-box;
        width: 300px;
        height: 100%;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        user-select: none;
        display:flex;
        flex-direction: column;
        overflow:hidden;
    }

    .outliners.open .outliners-content {
        transform: translateX(0);
    }

    hr {
        border: none;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        margin: 10px 0;
    }
</style>
