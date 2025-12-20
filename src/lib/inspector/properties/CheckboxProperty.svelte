<script lang="ts">
	let { targets, property = $bindable(), onUpdate = null } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

<input
	type="checkbox"
	class="checkbox-property"
	bind:checked={property.value}
	onchange={() => onUpdate && onUpdate()}
/>

<style>
	.checkbox-property {
	}
</style>
