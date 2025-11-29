<script lang="ts">
	import Toolbar from '$lib/components/Toolbar.svelte';
	import WidgetPalette from '$lib/components/WidgetPalette.svelte';
	import OscTreePanel from '$lib/components/OscTreePanel.svelte';
	import BoardCanvas from '$lib/components/BoardCanvas.svelte';
	import InspectorPanel from '$lib/components/InspectorPanel.svelte';
</script>

<div class="app-shell">
	<Toolbar />
	<div class="left-column">
		<WidgetPalette />
		<OscTreePanel />
	</div>
	<BoardCanvas />
	<InspectorPanel />
</div>
