<script lang="ts">
	import { Menu, menuState } from './inspector.svelte.ts';
	import { selectedWidgets } from '$lib/widget/widgets.svelte.ts';
	import DataInspector from './DataInspector.svelte';
	import GenericInspector from './GenericInspector.svelte';
	import { mainState } from '$lib/engine/engine.svelte.ts';

	// const menus = Object.entries(Menu).filter((s, m) => typeof m === 'string');

	let targets = $state<any[]>([]);

	$effect(() => {
		switch (menuState.currentMenu) {
			case Menu.Widget:
				targets = selectedWidgets;
				break;

			case Menu.Board:
				targets = mainState.selectedBoard ? [mainState.selectedBoard] : [];
				break;

			case Menu.Server:
				targets = mainState.selectedServer ? [mainState.selectedServer] : [];
				break;

			case Menu.Global:
				targets = mainState.globalSettings ? [mainState.globalSettings] : [];
				break;
		}
	});
</script>

<div class="inspector">
	<div class="menu-bar">
		{#each Object.values(Menu) as menu}
			<button
				class="menu-button {menu === menuState.currentMenu ? 'active' : ''}"
				style="--accent-color: var(--{menu.toLowerCase()}-color)"
				onclick={() => (menuState.currentMenu = menu as Menu)}>{menu}</button
			>
		{/each}
	</div>

	<div class="inspector-content">
		<GenericInspector {targets} />
	</div>

	<div class="spacer" style="flex-grow: 1;"></div>

	<div class="data-inspector">
		<DataInspector targets={selectedWidgets} />
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
		margin: 1em 0 0.5rem;
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
		height: 100%;
		flex-grow: 1;
		overflow: auto;
	}

	.data-inspector {
		max-height: 30%;
		overflow-x: hidden;
		border-top: solid 1px var(--border-color);
		padding: 0.5rem;
		font-size: 0.7rem;
		color: var(--text-color);
	}
</style>
