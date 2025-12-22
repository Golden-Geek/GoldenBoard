<script lang="ts">
	import ColorPicker from '$lib/components/ColorPicker.svelte';

	let {
		targets,
		property = $bindable(),
		definition,
		onStartEdit = null,
		onUpdate = null,
		expressionMode,
		expressionHasError
	} = $props();
</script>

<ColorPicker
	previewIsSwitch={!expressionMode && !definition.readOnly}
	color={property.get()}
	onchange={(value: any) => {
		if (expressionMode) return;
		property.set(value);
	}}
	onStartEdit={() => onStartEdit && onStartEdit()}
	onEndEdit={() => onUpdate && onUpdate()}
></ColorPicker>

<style>
</style>
