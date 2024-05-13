<script>
    import { editMode } from "$lib/editor/store";

    let files = [];

    $: if (files.length > 0) {
        console.log(files);
    }
</script>

<div class="topbar {$editMode ? 'editing' : ''}">
    <div class="topbar-content">
        <input type="file" bind:files />
    </div>
</div>

<style>
    .topbar {
        display: flex;
        justify-content: center;
        background-color: #333;
        flex-basis: 0px;
        transition: flex-basis 0.3s ease, box-shadow 0.3s ease;
        overflow: hidden;
    }

    .topbar.editing {
        flex-basis: 40px;
        box-shadow: 0 10px 10px rgba(0, 0, 0, 0.3);
    }

    .topbar-content {
        padding: 10px;
        box-sizing: border-box;
    }

   
</style>