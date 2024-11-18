<script>
    let { name, parent, property } = $props();
</script>

<input type="number" bind:value={parent[name]} />

<style>
    input {
        width: 100%;
    }
</style>