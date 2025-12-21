<script lang="ts">
	import ColorPicker from '$lib/components/ColorPicker.svelte';

	let {
		targets,
		property = $bindable(),
		definition,
		onStartEdit = null,
		onUpdate = null
	} = $props();

</script>

<ColorPicker
	previewIsSwitch={true}
	bind:color={property.value}
	onStartEdit={() => onStartEdit && onStartEdit(property.value)}
	onEndEdit={() => onUpdate && onUpdate()}
></ColorPicker>

<style>
</style>
