<script lang="ts">
	import ColorPicker from '$lib/components/ColorPicker.svelte';

	let {
		targets,
		property = $bindable(),
		definition,
		onStartEdit = null,
		onUpdate = null,
		shownValue,
		expressionMode,
		expressionHasError
	} = $props();
</script>

<ColorPicker
	previewIsSwitch={!expressionMode && !definition.readOnly}
	color={shownValue}
	onchange={(value: any) => {
		if (expressionMode) return;
		property.value = value;
	}}
	onStartEdit={() => onStartEdit && onStartEdit(property.value)}
	onEndEdit={() => onUpdate && onUpdate()}
></ColorPicker>

<style>
</style>
