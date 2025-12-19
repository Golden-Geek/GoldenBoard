<script lang="ts">
	let { targets, property } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

<textarea class="text-editor-property">
	{property.value}
</textarea>

<style>
	.text-editor-property {
	}
</style>
