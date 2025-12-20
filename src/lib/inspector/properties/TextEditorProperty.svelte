<script lang="ts">
	let { targets, property = $bindable(), definition, onStartEdit = null, onUpdate = null } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);

</script>

<textarea
	class="text-editor-property"
	disabled={definition.readOnly}
	bind:value={property.value}
	onfocus={() => onStartEdit && onStartEdit(property.value)}
	onblur={() => onUpdate && onUpdate()}
>
</textarea>

<style>
	/* .text-editor-property {
	} */
</style>
