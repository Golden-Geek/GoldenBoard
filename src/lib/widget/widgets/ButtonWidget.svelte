<script lang="ts">
	let { widget, board, label } = $props();

	let valueProp = $derived(widget.getSingleProp('value'));
	let momentary = $derived(widget.getSingleProp('momentary').get() || false);
</script>

<input
	type="button"
	class="button {valueProp.get() ? 'active' : ''} {momentary ? 'momentary' : ''}"
	value={label || 'Trigger'}
	onmousedown={() => {
		if (momentary) valueProp.set(1);
	}}
	onmouseup={() => {
		if (momentary) valueProp.set(0);
	}}
	onclick={() => {
		if (!momentary) valueProp.set(valueProp.get() ? 0 : 1);
	}}
/>

<style>
	.button {
		width: 100%;
		height: 2.5rem;
		font-size: 1rem;
		font-weight: bold;
	}

	.button.active {
		background-color: var(--button-active-bg-color);

		color: rgba(from var(--text-color) r g b / 70%);
	}

	.button.momentary {
		transition: background-color 0.3s;
	}

	.button.active.momentary {
		transition: background-color 0s;
	}
</style>
