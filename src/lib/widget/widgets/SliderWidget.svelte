<script lang="ts">
	import Slider from '../../components/Slider.svelte';
	let { widget, board, label } = $props();

	let valueProp = $derived(widget.getSingleProp('value'));
	let value = valueProp.get();
	let min = $derived(widget.getSingleProp('range.min').get());
	let max = $derived(widget.getSingleProp('range.max').get());
</script>

<Slider
	{value}
	onValueChange={(val) => valueProp.set(val)}
	{min}
	{max}
    {label}
    showValue={true}
	width="100%"
	height="2rem"
/>
