<script>
    let { name, parent, property } = $props();
</script>

<div class="slider-container">
    <input
        type="range"
        min={property.min}
        max={property.max}
        bind:value={parent[name]}
    />
    <span class="label">{parent[name]}</span>
</div>

<style>
    .slider-container {
        display: flex;
        align-items: center;
    }

    input {
        padding:0;
        margin:0;
        width: 100%;
    }

    .label {
        margin-left: 0.5em;
        min-width: 2em;
        text-align: right;
    }
</style>
