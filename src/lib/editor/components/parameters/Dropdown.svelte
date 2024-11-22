<script>
    let { comp, parameter, classes, css } = $props();
</script>

<select class={classes} style={css}>
    {#each comp.options?.options as option}
        <option value={option}>{option}</option>
    {/each}
</select>

<style>
</style>
