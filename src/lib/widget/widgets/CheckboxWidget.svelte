<script lang="ts">
	let { widget, board, label } = $props();

	let valueProp = $derived(widget.getSingleProp('value'));
</script>

<input
	type="checkbox"
	class="checkbox"
	onchange={(e: Event) => valueProp.set((e.target as HTMLInputElement).checked ? 1 : 0)}
	checked={valueProp.get() ? true : false}
/>
{label || 'Checkbox'}

<style>
	.checkbox {
		width: 100%;
        /* pink accent for native checkbox */
        accent-color: #ec4899;
        cursor: pointer;
	}
</style>
