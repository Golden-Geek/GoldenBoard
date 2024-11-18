<script>
    let { name, comp, property } = $props();
</script>

<input type="text" bind:value={comp[name]} />


<style>
    input {
        width: 100%;
    }  
</style>