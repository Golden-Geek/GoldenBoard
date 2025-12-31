<script lang="ts">
	import { slide } from 'svelte/transition';
	import WidgetRenderer from '../WidgetRenderer.svelte';
	import type { Widget } from '../widgets.svelte';

	let { board, widget, layout, showLabel, labelPlacement } = $props();

	let allowMultipleOpen = $derived(widget.getSingleProp('allowMultipleOpen')?.get() ?? false);

	let openedWidgets: string[] = $state([]);
	function toggleOpen(w: Widget) {
		if (openedWidgets.includes(w.id)) {
			openedWidgets.splice(openedWidgets.indexOf(w.id), 1);
		} else {
			if (!allowMultipleOpen) {
				openedWidgets.length = 0;
			}
			openedWidgets.push(w.id);
		}
	}

	$effect(() => {
		// Close all accordions when allowMultipleOpen is turned off
		if (!allowMultipleOpen && openedWidgets.length > 1) {
			openedWidgets = openedWidgets.slice(0, 1);
		}
	});
</script>

<div class="widget-children-container">
	{#each widget.children as childWidget}
		<div class="accordion-item" class:opened={openedWidgets.includes(childWidget.id)}>
			<div class="accordion-header" onclick={() => toggleOpen(childWidget)}>
				{childWidget.name}
				<span
					class="arrow {openedWidgets.includes(childWidget.id) ? 'expanded' : ''} accordion-toggle"
				></span>
			</div>
			{#if openedWidgets.includes(childWidget.id)}
				<div class="accordion-content" transition:slide={{ duration: 200 }}>
					<WidgetRenderer {board} widget={childWidget} />
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.accordion-item {
		border-radius: 0.25rem;
		margin-bottom: 0.25rem;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.accordion-header {
		border: 1px solid rgba(from var(--panel-bg-color) r g b / 5%);
		background-color: rgba(from var(--panel-bg-color) r g b / 3%);
        transition: background-color 0.3s ease, border 0.2s ease;
	}

	.accordion-header:hover {
		border: 1px solid rgba(from var(--panel-bg-color) r g b / 8%);
		background-color: rgba(from var(--panel-bg-color) r g b / 5%);
	}

	.accordion-header {
		cursor: pointer;
	}
</style>
