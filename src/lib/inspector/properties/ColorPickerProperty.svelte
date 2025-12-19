<script lang="ts">
	let { targets, property } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

{#if target}
    <label class="checkbox-property">
        <span>{property.label}</span>
        <input
            type="color"
            bind:value={target[property.key]}
            on:input={(e) => (target[property.key] = e.target.value)}
            aria-label={property.label}
        />
    </label>
{/if}
<style>
	.checkbox-property {
	}
</style>
