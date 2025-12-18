<script lang="ts">
	import { servers, addServer, removeServer, getNodeIcon } from '$lib/oscquery/servers.svelte';
	import { mainData } from '$lib/engine.svelte';
	import { ConnectionStatus, OSCQueryClient } from '$lib/oscquery/oscquery.svelte';
	import TreeView from '$lib/components/TreeView.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import RemoveButton from '$lib/components/RemoveButton.svelte';
	import EditableButton from '$lib/components/EditableButton.svelte';

	let selectedServerName: string | null = $derived(mainData.serverData.selectedServer);

	let currentServer: OSCQueryClient | undefined = $derived(
		selectedServerName ? servers.find((server) => server.name === selectedServerName) : undefined
	);

	let ip = $state('');
	let port = $state(0);

	$effect(() => {
		if (currentServer == undefined && servers.length > 0) {
			selectedServerName = servers[0].name;
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
						selectedServerName = server.name;
					}}
					hasRemoveButton={servers.length > 1}
					selected={selectedServerName === server.name}
					bind:value={server.name}
					onremove={() => {
						removeServer(server);
						if (currentServer == server) currentServer = undefined;
					}}
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
