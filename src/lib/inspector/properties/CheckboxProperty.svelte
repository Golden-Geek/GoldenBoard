<script lang="ts">
	let { targets, property = $bindable(), definition, onUpdate } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

<input
	type="checkbox"
	class="editor-checkbox"
	disabled={definition.readOnly}
	bind:checked={property.value}
	onchange={() => onUpdate && onUpdate()}
/>

<style>
</style>
