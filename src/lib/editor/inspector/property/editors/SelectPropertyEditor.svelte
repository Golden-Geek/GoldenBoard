<script>
    let { name, comp, property } = $props();
</script>

<select bind:value={comp[name]}>
    {#each property.options as option}
        <option value={option}>{option}</option>
    {/each}
</select>

<style>
    select {
        width: 100%;
    }
</style>
