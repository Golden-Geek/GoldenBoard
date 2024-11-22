<script>
    let { name, comp, property } = $props();

    let value = $state(comp[name]?.replace(/[^\d.]/g, ""));
    let unit = $state(comp[name]?.replace(/[\d.]/g, ""));
    $effect(() => {
        if(!value || !unit) {
            delete comp[name];
                return;
        }
        comp[name] =  value + unit;
    });
</script>

<input type="number" bind:value />
<select bind:value={unit}>
    <option value="px">px</option>
    <option value="%">%</option>
    <option value="em">em</option>
</select>

<style>
    input {
        flex: 1;
    }
</style>
