<script lang="ts">
	import { Menu, menuComponents, menuState } from './inspector.svelte.ts';
	import { mainState } from '$lib/engine.svelte';
	import { selectedWidgets } from '$lib/widget/widgets.svelte.ts';

	// const menus = Object.entries(Menu).filter((s, m) => typeof m === 'string');

	let Inspector = $derived(menuComponents[menuState.currentMenu]);
</script>

<div class="inspector">
	<div class="menu-bar">
		{#each Object.entries(menuComponents) as [menu, inspector]}
			<button
				class="menu-button {menu === menuState.currentMenu ? 'active' : ''}"
				style="--accent-color: var(--{menu.toLowerCase()}-color)"
				onclick={() => (menuState.currentMenu = menu as Menu)}>{menu}</button
			>
		{/each}
	</div>

	<div class="inspector-content">
		{#if Inspector != null && selectedWidgets.length > 0}
			<Inspector targets={selectedWidgets} />
		{:else}
			<p style="padding: 1rem;">No Inspector for this</p>
		{/if}
	</div>
</div>

<style>
	.inspector {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.menu-bar {
		position: relative;
		margin-top: 1em;
		display: flex;
		justify-content: space-around;
		background-color: var(--panel-background-color);
		border-bottom: 1px solid var(--border-color);
	}

	button.menu-button {
		background-color: var(--panel-background-color);
		border: none;
		padding: 0.5em 1em;
		cursor: pointer;
		color: var(--text-color);
		font-size: 0.8rem;
		border-bottom: solid 2px transparent;
		transition:
			color 0.1s,
			border-bottom-color 0.1s;
		border-radius: 0px;
	}

	button.menu-button:hover {
		color: var(--accent-color);
		border-bottom-color: var(--accent-color);
	}

	button.menu-button.active {
		font-weight: bold;
		border-bottom-color: var(--accent-color);
	}

	.inspector-content {
		padding: 0.1rem;
		height: 100%;
		flex-grow: 1;
		overflow: auto;
	}
</style>
