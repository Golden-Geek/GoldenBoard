<script lang="ts">
	import { addServer, servers } from '$lib/oscquery/servers.svelte';
	import { editorState } from './editor.svelte';
	import { ConnectionStatus, OSCQueryClient } from '$lib/oscquery/oscquery.svelte';
	import TreeView from '$lib/components/TreeView.svelte';

	let currentServer: OSCQueryClient | undefined = $state(undefined);
	let ip = $state('');
	let port = $state(0);

	$effect(() => {
		if (editorState.selectedServerName == null && servers.length > 0) {
			editorState.selectedServerName = servers[0].name;
		}

		currentServer = servers.find((server) => server.name === editorState.selectedServerName);
		if (currentServer) {
			ip = currentServer.ip;
			port = currentServer.port;
		}
	});
</script>

<div class="server-content">
<div class="header">
	<button aria-label="Add server" class="icon-btn" onclick={addServer}>
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
			<line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2" />
			<line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" />
		</svg>
	</button>

	<div class="server-bar">
		{#each servers as server (server.name)}
			<button
				class="server-btn {currentServer == server ? 'selected' : ''}"
				aria-label={server.name}
				onclick={() => {
					editorState.selectedServerName = server.name;
				}}
			>
				{server.name}
			</button>
		{/each}
	</div>
</div>

{#if currentServer != undefined}
	<div class="server-info">
		<input class="server-ip" type="text" bind:value={ip} placeholder="IP" />
		<input class="server-port" type="text" bind:value={port} placeholder="Port" />
		<button
			onclick={() => {
				if (currentServer?.status == ConnectionStatus.Connected) {
					currentServer?.disconnect();
				} else {
					currentServer?.setIPAndPort(ip, port);
				}
			}}>{currentServer!.status == ConnectionStatus.Connected ? 'Disconnect' : 'Connect'}</button
		>
		<div
			class="icon {currentServer!.status == ConnectionStatus.Connected
				? 'connected'
				: 'disconnected'}-icon"
		></div>
	</div>

	<TreeView data={currentServer!.data} />
{/if}
</div>

<style>
	.server-content {
		display: flex;
		flex-direction: column;
		height: 100%;
		box-sizing: border-box;
	}

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

	.server-info {
		display: flex;
		margin-top: 0.5rem;
		gap: 0.5rem;
		width: 100%;
		align-items: center;
	}

	.server-ip {
		flex-grow: 2;
	}

	.server-port {
		flex-grow: 1;
	}

	.server-info input {
		width: 100%;
		flex-grow: 1;
	}

	.server-info .icon {
		min-width: 20px;
		min-height: 20px;
	}
</style>
