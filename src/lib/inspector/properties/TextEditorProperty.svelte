<script lang="ts">
	let { targets, property = $bindable(), onUpdate = null } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

<textarea
	class="text-editor-property"
	bind:value={property.value}
	onblur={() => onUpdate && onUpdate()}
>
</textarea>

<style>
	.text-editor-property {
	}
</style>
