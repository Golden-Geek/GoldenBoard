<script lang="ts">
	import { Menu, menuComponents, menuState } from '../inspector/inspector.svelte.ts';
	import { mainData } from '$lib/engine.svelte';

	const menus = Object.values(Menu).filter((v) => typeof v === 'string') as string[];

	let Inspector = $derived(menuComponents[menuState.currentMenu]);
</script>

<div class="inspector">
	<div class="menu-bar">
		{#each menus as menu}
			<button
				class="menu-button {menu === menuState.currentMenu ? 'active' : ''}"
				onclick={() => (menuState.currentMenu = menu as Menu)}>{menu}</button
			>
		{/each}
	</div>

	<div class="inspector-content">
		{#if Inspector != null}
			<Inspector targets={mainData.editor.selectedWidgetIDs} />
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
