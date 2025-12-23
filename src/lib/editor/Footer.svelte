<script lang="ts">
	import { history, redo, undo } from '$lib/engine/engine.svelte';
	import { activeExpressions } from '$lib/property/expression.svelte';
	import { activeUserIDs } from '$lib/property/inspectable.svelte';
	import { selectedWidgets, widgetsMap } from '$lib/widget/widgets.svelte';

	let numExpressions = $derived(activeExpressions.length);
	let runningExpressions = $derived(activeExpressions.filter((e) => e.mode == 'expression').length);
</script>

<div class="footer">
	<div class="spacer"></div>
	<div class="history-info">
		{#if history.present != null}
			{#each history.past as h, index (index)}
				{#if index >= history.past.length - 3}
					<button
						class="button history-item undo"
						onclick={() => undo(history.past.length - index)}
					>
						{h.label || 'Unnamed Action'}</button
					>
				{/if}
			{/each}
			<div class="separator"></div>
			<button class="button history-item current">
				{history.present.label || 'Unnamed action'}
			</button>
			<div class="separator"></div>
			{#each history.future as h, index (index)}
				{#if index < 3}
					<button class="button history-item redo" onclick={() => redo(index + 1)}>
						{h.label || 'Unnamed Action'}
					</button>
				{/if}
			{/each}
		{:else}
			<button> No history </button>
		{/if}
	</div>
	<div class="spacer"></div>

	<div class="widget-info">
		{Object.keys(widgetsMap).length} widgets loaded - {selectedWidgets.length} selected
	</div>
	/
	<div class="userid-info">
		{Object.keys(activeUserIDs).length} active user IDs
	</div>

	<div class="expressions-info">
		{numExpressions} expressions, {runningExpressions} active
	</div>
</div>

<style>
	.footer {
		height: 2.5rem;
		display: flex;
		align-items: center;
		padding: 0 10px;
		box-sizing: border-box;
		background-color: var(--panel-bg-color);
		color: rgba(from var(--text-color) r g b / 30%);
		box-shadow: 1px -1px 5px rgba(0, 0, 0, 1);
		align-items: center;
		justify-content: center;
	}

	.spacer {
		flex-grow: 1;
	}

	.history-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.separator {
		color: rgba(from var(--text-color) r g b / 10%);
		width: 2px;
		background-color: var(--border-color);
		height: 1rem;
	}

	.history-item {
		font-size: 0.7rem;
	}

	.history-item.current {
		color: #4793d1;
	}

	.widget-info,
	.userid-info {
		font-size: 0.7rem;
		color: rgba(from var(--text-color) r g b / 50%);
		padding: 0 0.5rem;
	}

	.expressions-info {
		font-size: 0.7rem;
		color: rgba(from var(--text-color) r g b / 50%);
		padding: 0 0.5rem;
	}
</style>
