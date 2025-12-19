<script lang="ts">
	let { targets, property } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

<input type="text" class="text-property" bind:value={property.value} />

<style>
	.text-property {
	}
</style>
