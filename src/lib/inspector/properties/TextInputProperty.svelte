<script lang="ts">
	let { targets, property = $bindable(), onUpdate = null } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

<input
	type="text"
	class="text-property"
	bind:value={property.value}
	onblur={() => onUpdate && onUpdate()}
	onkeydown={(e) => {
		if (e.key === 'Enter' && onUpdate) onUpdate();
	}}
/>

<style>
	.text-property {
		height: 100%;
		box-sizing: border-box;
		font-size: 0.75rem;
	}
</style>
