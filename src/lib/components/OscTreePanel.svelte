<script lang="ts">
	import OscTreeNode from '$lib/components/OscTreeNode.svelte';
	import { oscStructure } from '$lib/stores/oscquery';
</script>

<div class="panel osc-panel">
	<div class="section-title">OSC Query</div>
	{#if $oscStructure}
		<div class="osc-tree" role="tree">
			<OscTreeNode node={$oscStructure} depth={0} />
		</div>
	{:else}
		<p class="muted">Connect to an OSCQuery server to browse parameters.</p>
	{/if}
</div>
