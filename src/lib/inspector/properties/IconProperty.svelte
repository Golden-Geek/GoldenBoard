<script lang="ts">
	import 'emoji-picker-element';
	import { tick } from 'svelte';
	let { targets, property = $bindable(), definition, onUpdate = null } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);

	let showPicker = $state(false);
	let picker = $state(null as HTMLElement | null);

	$effect(() => {
		if (showPicker && picker) {
			picker.addEventListener('emoji-click', (event: any) => {
				property.value = event.detail.unicode;
				onUpdate && onUpdate();
				showPicker = false;
			});

            picker.focus();
		}
	});
</script>

<div class="emoji-picker-container">
	<button onclick={() => (showPicker = !showPicker)} class="icon-property">
		{property.value != '' ? property.value : 'Choose'}
	</button>

	<button onclick={() => (property.value = '')} class="clear-property" aria-label="Clear Icon">
		❌
	</button>

	{#if showPicker}
		<emoji-picker
			bind:this={picker}
			class="emoji-picker"
            tabindex="-1"
			onblur={() => (showPicker = false)}
			onfocusout={() => (showPicker = false)}
		></emoji-picker>
	{/if}
</div>

<style>
	button {
		padding: 0;
		margin-right: 0.25rem;
		font-size: 0.7rem;
		height: 1em;
	}

	.icon-property {
		height: 100%;
		box-sizing: border-box;
		background: none;
		border: 1px solid var(--border-color);
		cursor: pointer;
	}

	.clear-property {
		background: none;
		border: none;
		cursor: pointer;
	}

	.emoji-picker {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 10;
	}
</style>
