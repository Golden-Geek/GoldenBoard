<script lang="ts">
	let { targets, property } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

<input type="checkbox" class="checkbox-property" bind:checked={property.value} />

<style>
	.checkbox-property {
	}
</style>
