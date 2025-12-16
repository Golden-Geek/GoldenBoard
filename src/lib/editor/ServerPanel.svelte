<script>
	import { addServer, servers } from '$lib/oscquery/servers.svelte';
	import { onMount } from 'svelte';
	import { editorState } from './editor.svelte';

	$effect(() => {
		if (editorState.selectedServerName == null && servers.length > 0
		) {
			editorState.selectedServerName = servers[0].name;
		}
	});
</script>

<div class="header">
	<button aria-label="Add server" class="icon-btn" on:click={addServer}>
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
			<line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2" />
			<line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" />
		</svg>
	</button>

	<div class="server-bar">
		{#each servers as server (server.name)}
			<button
				class="server-btn {editorState.selectedServerName == server.name ? 'selected' : ''}"
				aria-label={server.name}
				on:click={() => {
					editorState.selectedServerName = server.name;
				}}
			>
				{server.name}
			</button>
		{/each}
	</div>

	
</div>

<style>
	.header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.icon-btn {
		background: none;
		border: none;
		padding: 0;
		border-radius: 50%;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	svg {
		display: block;
		color: #1ea7d5;
		transition: color 0.2s;
	}
	.icon-btn:hover svg {
		color: #ffffff;
	}

	

	.server-bar {
		display: flex;
		gap: 0.5rem;
	}


	.server-btn.selected {
		background-color: #1e89d5;
		color: #222;
		font-weight: bold;
	}

	.server-btn:hover {
		background-color: #1348a4;
		color: #222;
	}
</style>
