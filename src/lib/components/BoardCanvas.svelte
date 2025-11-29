<script lang="ts">
	import WidgetRenderer from '$lib/components/WidgetRenderer.svelte';
	import { activeBoard, selectWidget, selectedWidget } from '$lib/stores/boards';
</script>

<div class="panel canvas-panel">
	<div class="section-title">Board Canvas</div>
	{#if $activeBoard}
		<div
			class="board-canvas"
			role="button"
			aria-label="Board canvas"
			tabindex="0"
			on:click={() => selectWidget($activeBoard.root.id)}
			on:keydown={(event) =>
				(event.key === 'Enter' || event.key === ' ')
					? (event.preventDefault(), selectWidget($activeBoard.root.id))
					: null}
		>
			<WidgetRenderer widget={$activeBoard.root} selectedId={$selectedWidget?.widget.id} />
		</div>
	{:else}
		<p class="muted">No board selected.</p>
	{/if}
</div>
