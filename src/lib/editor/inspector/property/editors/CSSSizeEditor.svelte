<script>
    let { name, parent, property } = $props();

    let value = $state(parent[name]?.replace(/[^\d.]/g, ""));
    let unit = $state(parent[name]?.replace(/[\d.]/g, ""));
    $effect(() => {
        if(!value || !unit) {
            delete parent[name];
                return;
        }
        parent[name] =  value + unit;
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
