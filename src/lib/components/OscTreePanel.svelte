<script lang="ts">
	import OscTreeNode from '$lib/components/OscTreeNode.svelte';
	import { connectOsc, disconnectOsc, oscEndpoint, oscStatus, oscStructure, oscHostInfo } from '$lib/stores/oscquery';

	let endpoint = '';
	$: endpoint = $oscEndpoint;

	const handleConnect = () => {
		oscEndpoint.set(endpoint);
		connectOsc(endpoint);
	};

	const handleDisconnect = () => {
		disconnectOsc();
	};
</script>

<div class="panel osc-panel">
	<div class="osc-header">
		<div>
			<div class="section-title">OSC Query</div>
			<span class={`status-dot ${$oscStatus}`}>{$oscStatus}</span>
		</div>
		{#if $oscHostInfo}
			<div class="host-meta">
				<strong>{$oscHostInfo.name}</strong>
				<small>
					{$oscHostInfo.oscIp ?? '—'}{#if $oscHostInfo.oscPort}:{$oscHostInfo.oscPort}{/if}
					{#if $oscHostInfo.transport}
						&nbsp;&middot;&nbsp;{$oscHostInfo.transport.toUpperCase()}
					{/if}
				</small>
			</div>
		{/if}
		<div class="connection">
			<input
				value={endpoint}
				type="text"
				placeholder="http://localhost:53000"
				aria-label="OSC endpoint"
				on:input={(event) => (endpoint = (event.target as HTMLInputElement).value)}
			/>
			<button type="button" on:click={handleConnect}>Connect</button>
			<button type="button" class="ghost" on:click={handleDisconnect}>Disconnect</button>
		</div>
	</div>
	{#if $oscStructure}
		<div class="osc-tree" role="tree">
			<OscTreeNode node={$oscStructure} depth={0} />
		</div>
	{:else}
		<p class="muted">Connect to an OSCQuery server to browse parameters.</p>
	{/if}
</div>

<style>
	.osc-panel {
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.osc-header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.host-meta {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.host-meta strong {
		font-size: 0.9rem;
	}

	.host-meta small {
		font-size: 0.75rem;
		color: var(--muted);
	}

	.status-dot {
		font-size: 0.75rem;
		text-transform: capitalize;
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.05);
	}

	.status-dot.connected {
		color: #7ef7c1;
		background: rgba(126, 247, 193, 0.15);
	}

	.status-dot.error {
		color: var(--danger);
		background: rgba(255, 107, 107, 0.18);
	}

	.connection {
		display: flex;
		gap: 0.4rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.connection input {
		flex: 1;
		min-width: 200px;
	}
</style>
