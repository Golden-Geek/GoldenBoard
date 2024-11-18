<script>
    let { name, parent, property } = $props();
</script>

<select bind:value={parent[name]}>
    {#each property.options as option}
        <option value={option}>{option}</option>
    {/each}
</select>

<style>
    select {
        width: 100%;
    }
</style>
