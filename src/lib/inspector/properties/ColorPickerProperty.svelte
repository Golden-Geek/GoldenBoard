<script lang="ts">
	import ColorPicker from '$lib/components/ColorPicker.svelte';

	let {
		property = $bindable(),
		definition,
		onStartEdit = null,
		onUpdate = null,
		expressionMode
	} = $props();

</script>

<ColorPicker
	previewIsSwitch={!expressionMode && !definition.readOnly}
	color={property.get()}
	onchange={(value: any) => {
		property.set(value);
	}}
	onStartEdit={() => onStartEdit && onStartEdit()}
	onEndEdit={() => onUpdate && onUpdate()}
></ColorPicker>

<style>
</style>
