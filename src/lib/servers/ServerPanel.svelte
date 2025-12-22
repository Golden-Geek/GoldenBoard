<script lang="ts">
	import { ConnectionStatus, addServer, removeServer, getNodeIcon } from './oscquery.svelte';
	import { mainState, saveData } from '$lib/engine/engine.svelte';
	import TreeView from '$lib/components/TreeView.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import EditableButton from '$lib/components/EditableButton.svelte';
	import { Menu } from '../inspector/inspector.svelte.ts';

	let servers = $derived(mainState.servers);
	let selectedServer = $derived(mainState.selectedServer);

	let ip = $state('');
	let port = $state(0);

	$effect(() => {
		if (selectedServer != null) {
			ip = selectedServer!.ip;
			port = selectedServer!.port;
		}
	});
</script>

<div class="server-content">
	<div class="header">
		<AddButton onclick={() => addServer()} />

		<div class="server-bar">
			{#each servers as server}
				<EditableButton
					onSelect={() => {
						mainState.selectedServer = server;
						mainState.editor.inspectorMenu = Menu.Server;
						saveData('Select Server', { coalesceID: 'select-server' });
					}}
					hasRemoveButton={servers.length > 1}
					selected={server.isSelected}
					value={server.name}
					separator={' - '}
					onRemove={() => {
						if (selectedServer == server) selectedServer = null;
						removeServer(server);
					}}
					warning={server.status != ConnectionStatus.Connected ? 'Server Disconnected' : ''}
					color={'var(--server-color)'}
				></EditableButton>
			{/each}
		</div>
	</div>

	{#if selectedServer != undefined}
		<div class="server-info">
			<input
				class="server-ip"
				type="text"
				bind:value={ip}
				placeholder="IP"
				onblur={() => selectedServer?.setIPAndPort(ip, port)}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						selectedServer?.setIPAndPort(ip, port);
					}
				}}
			/>
			<input
				class="server-port"
				type="text"
				bind:value={port}
				placeholder="Port"
				onblur={() => selectedServer?.setIPAndPort(ip, port)}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						selectedServer?.setIPAndPort(ip, port);
					}
				}}
			/>

			<div
				class="icon {selectedServer!.status == ConnectionStatus.Connected
					? 'connected'
					: 'disconnected'}-icon"
			></div>
		</div>

		<TreeView
			data={selectedServer!.data.structure}
			showRoot={false}
			getChildren={(node: any) => (node.CONTENTS ? Object.values(node.CONTENTS) || [] : [])}
			isContainer={(node: any) => node.CONTENTS}
			getIcon={getNodeIcon}
			getTitle={(node: any) => node.DESCRIPTION || node.NAME || '/'}
			highlightColor={'var(--server-color)'}
		></TreeView>

		<div class="server-extra">
			{selectedServer.activeListenedNodes.length} active listening nodes
		</div>
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

	.server-bar {
		display: flex;
		gap: 0.5rem;
		width: 100%;
		overflow: auto;
		padding: 0.3em;
	}

	.server-info {
		display: flex;
		margin: 0.5rem 0 0.2rem;
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

	.server-extra {
		text-align: center;
		border-top: solid 1px rgba(from var(--border-color) r g b / 20%);
		padding-top: 0.25rem;
		font-size: 0.7rem;
		color: var(--text-color);
		opacity: 0.7;
	}
</style>
