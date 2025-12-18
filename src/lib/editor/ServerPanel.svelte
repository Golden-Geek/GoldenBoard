<script lang="ts">
	import { servers, addServer, removeServer, getNodeIcon } from '$lib/oscquery/servers.svelte';
	import { mainData } from '$lib/engine.svelte';
	import { ConnectionStatus, OSCQueryClient } from '$lib/oscquery/oscquery.svelte';
	import TreeView from '$lib/components/TreeView.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import RemoveButton from '$lib/components/RemoveButton.svelte';
	import EditableButton from '$lib/components/EditableButton.svelte';

	let selectedServerID: string | null = $derived(mainData.serverData.selectedServer);

	let currentServer: OSCQueryClient | undefined = $derived(
		selectedServerID ? servers.find((server) => server.id === selectedServerID) : undefined
	);

	let ip = $state('');
	let port = $state(0);

	$effect(() => {
		if (currentServer == undefined && servers.length > 0) {
			selectedServerID = servers[0].id;
		}

		if (currentServer) {
			ip = currentServer!.ip;
			port = currentServer!.port;
		}
	});
</script>

<div class="server-content">
	<div class="header">
		<AddButton onclick={() => addServer()} />

		<div class="server-bar">
			{#each servers as server}
				<EditableButton
					onselect={() => {
						selectedServerID = server.id;
					}}
					hasRemoveButton={servers.length > 1}
					selected={selectedServerID === server.id}
					bind:value={server.name}
					separator={' - '}
					onremove={() => {
						removeServer(server);
						if (currentServer == server) currentServer = undefined;
					}}
					warning={server.status != ConnectionStatus.Connected ? 'Server Disconnected' : ''}
					color={'var(--server-color)'}
				></EditableButton>
			{/each}
		</div>
	</div>

	{#if currentServer != undefined}
		<div class="server-info">
			<input
				class="server-ip"
				type="text"
				bind:value={ip}
				placeholder="IP"
				onblur={() => currentServer?.setIPAndPort(ip, port)}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						currentServer?.setIPAndPort(ip, port);
					}
				}}
			/>
			<input
				class="server-port"
				type="text"
				bind:value={port}
				placeholder="Port"
				onblur={() => currentServer?.setIPAndPort(ip, port)}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						currentServer?.setIPAndPort(ip, port);
					}
				}}
			/>
			<!-- <button
				onclick={() => {
					if (currentServer?.status == ConnectionStatus.Connected) {
						currentServer?.disconnect();
					} else {
						currentServer?.connect();
					}
				}}>{currentServer!.status == ConnectionStatus.Connected ? 'Disconnect' : 'Connect'}</button
			> -->
			<div
				class="icon {currentServer!.status == ConnectionStatus.Connected
					? 'connected'
					: 'disconnected'}-icon"
			></div>
		</div>

		<TreeView
			data={currentServer!.data}
			showRoot={false}
			getChildren={(node: any) => (node.CONTENTS ? Object.values(node.CONTENTS) || [] : [])}
			isContainer={(node: any) => node.CONTENTS}
			getType={(node: any) => {
				if (node.CONTENTS) return 'Container';
				if (node.EXTENDED_TYPE) return node.EXTENDED_TYPE[0];
				if (!node.CONTENTS && node.TYPE == 'N') return 'Trigger';
				return undefined;
			}}
			getIcon={getNodeIcon}
			getTitle={(node: any) => node.DESCRIPTION || node.NAME || '/'}
			highlightColor={'var(--server-color)'}
		></TreeView>
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
</style>
