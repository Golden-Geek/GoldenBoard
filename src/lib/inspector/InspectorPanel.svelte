<script lang="ts">
	import { Menu } from './inspector.svelte.ts';
	import { selectedWidgets } from '../widget/widgets.svelte.ts';
	import DataInspector from './DataInspector.svelte';
	import GenericInspector from './GenericInspector.svelte';
	import { mainState, saveData } from '../engine/engine.svelte.ts';
	import { slide } from 'svelte/transition';

	// const menus = Object.entries(Menu).filter((s, m) => typeof m === 'string');

	let targets = $state<any[]>([]);
	let currentMenu = $derived(mainState.editor?.inspectorMenu);

	$effect(() => {
		switch (currentMenu) {
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

	function setCurrentMenu(menu: Menu) {
		mainState.editor.inspectorMenu = menu;
		saveData('Change Inspector Menu', { coalesceID: 'change-inspector-menu' });
	}

	let dataInspectorCollapsed = $state(true);
</script>

<div class="inspector">
	<div class="menu-bar">
		{#each Object.values(Menu) as menu}
			<button
				class="menu-button {menu === currentMenu ? 'active' : ''}"
				style="--accent-color: var(--{menu.toLowerCase()}-color)"
				onclick={() => setCurrentMenu(menu)}>{menu}</button
			>
		{/each}
	</div>

	<div class="inspector-content">
		<GenericInspector {targets} />
	</div>

	<div class="data-inspector {dataInspectorCollapsed ? 'collapsed' : ''}">
		<div class="data-inspector-header">
			<div class="button" onclick={() => (dataInspectorCollapsed = !dataInspectorCollapsed)}>
				Raw Data
				<div class="arrow {dataInspectorCollapsed ? 'up' : 'expanded'}"></div>
			</div>
		</div>
		{#if !dataInspectorCollapsed}
			<div class="data-inspector-content" transition:slide|local={{ duration: 200 }}>
				<DataInspector {targets} />
			</div>
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
		overflow-x: hidden;
		overflow-y: visible;
	}

	.data-inspector {
		max-height: 50%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.data-inspector .button {
		background-color: var(--panel-background-color);
		border-top: solid 1px var(--border-color);
		border-bottom: none;
		font-size: 0.7rem;
	}

	.arrow {
		margin-left: 0.5rem;
	}

	.data-inspector-content {
		overflow-x: hidden;
		overflow-y: visible;
		background-color: var(--bg-color);
		border-top: solid 1px var(--border-color);
		padding: 0.5rem;
		font-size: 0.7rem;
		color: var(--text-color);
		width: 100%;
		height: 100%;
	}
</style>
