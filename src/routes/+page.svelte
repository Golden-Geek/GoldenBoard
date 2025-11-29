<script lang="ts">
	import Toolbar from '$lib/components/Toolbar.svelte';
	import OscTreePanel from '$lib/components/OscTreePanel.svelte';
	import BoardCanvas from '$lib/components/BoardCanvas.svelte';
	import InspectorPanel from '$lib/components/InspectorPanel.svelte';
	import ModeToggle from '$lib/components/ModeToggle.svelte';
	import WidgetRenderer from '$lib/components/WidgetRenderer.svelte';
	import { editorMode } from '$lib/stores/ui';
	import { activeBoard } from '$lib/stores/boards';

	$: mode = $editorMode;
	const isLive = () => mode === 'live';
</script>

<div class={`app-root mode-${mode}`}>
	<ModeToggle />
	{#if !isLive()}
		<Toolbar />
	{/if}

	{#if isLive()}
		<div class="live-stage">
			{#if $activeBoard}
				<WidgetRenderer widget={$activeBoard.root} selectedId={undefined} rootId={$activeBoard.root.id} />
			{:else}
				<p class="muted">No board selected.</p>
			{/if}
		</div>
	{:else}
		<div class="workspace workspace-edit">
			<aside class="panel-column">
				<OscTreePanel />
			</aside>
			<main class="canvas-wrapper">
				<BoardCanvas />
			</main>
			<aside class="panel-column">
				<InspectorPanel />
			</aside>
		</div>
	{/if}
</div>
