<script lang="ts">
	let { targets, property = $bindable(), onUpdate = null } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

<input
	type="range"
	class="range-property"
	bind:value={property.value}
	min={property.min}
	max={property.max}
	step={property.step}
	onmouseup={() => onUpdate && onUpdate()}
/>

<style>
	.range-property {
		height: 100%;
		box-sizing: border-box;
	}
</style>
