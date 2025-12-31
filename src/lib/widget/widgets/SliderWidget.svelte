<script lang="ts">
	import { ColorUtil } from '$lib/property/Color.svelte';
	import type { Property } from '$lib/property/property.svelte';
	import Slider from '../../components/Slider.svelte';
	let { widget, board, label } = $props();

	let valueProp: Property = $derived(widget.getSingleProp('value'));
	let min = $derived(widget.getSingleProp('range.min').get());
	let max = $derived(widget.getSingleProp('range.max').get());
	let fgColor = $derived(ColorUtil.toHex(widget.getSingleProp('slider.fgColor').get()));
	let bgColor = $derived(ColorUtil.toHex(widget.getSingleProp('slider.bgColor').get()));
</script>

<Slider
	value={valueProp.get()}
	onValueChange={(val: number) => valueProp.set(val)}
	{min}
	{max}
	{label}
	{fgColor}
	{bgColor}
	showValue={true}
	width="100%"
	height="2rem"
/>
