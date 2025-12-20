<script lang="ts">
	import { contextMenus, menuContext, type ContextMenuItem } from '$lib/engine/engine.svelte';
	import { onMount, tick } from 'svelte';
	import Self from './ContextMenu.svelte';
	import { fly } from 'svelte/transition';

	let { submenu = null, offsetX = 0, offsetY = 0 } = $props();

	let type = $derived(menuContext.type);
	let target = $derived(menuContext.target);
	let pos = $derived(menuContext.position);

	let showMenu = $derived(type != null && target != null && pos.x != 0 && pos.y != 0);

	let menuFunc = $derived(contextMenus[type]);
	let menuItems: ContextMenuItem[] = $derived(submenu ? submenu : (menuFunc && target) ? menuFunc(target) : []);

	let menuDiv: HTMLDivElement | null = $state(null);
	let submenuDiv: HTMLDivElement | null = $state(null);


	let activeSubMenu = $state({
		items: null as ContextMenuItem[] | null,
		offsetX: 0,
		offsetY: 0
	});

	function closeMenu() {
		menuContext.target = null;
		menuContext.position = { x: 0, y: 0 };
		activeSubMenu.items = null;
	}

	$effect(() => {
		if (menuDiv) menuDiv?.focus();
	});

	function handleDocumentPointer(e: PointerEvent) {
		if (!menuDiv) return;
		const targetNode = e.target as Node | null;
		if (!targetNode) return;
		if (!menuDiv.contains(targetNode) && !submenuDiv?.contains(targetNode)) closeMenu();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeMenu();
	}

	onMount(() => {
		document.addEventListener('pointerdown', handleDocumentPointer);
		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('pointerdown', handleDocumentPointer);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

{#if showMenu}
	<div
		bind:this={menuDiv}
		class="context-menu"
		style="--x: {pos.y + offsetY}px; --y:{pos.x + offsetX}px"
		transition:fly={{ x: -5, duration: 100 }}
	>
		{#each menuItems as item}
			{#if item.visible || true}
				{#if item.separator}
					<hr />
				{:else}
					<button
						class="context-menu-item {item.disabled ? 'disabled' : ''} {item.checked
							? 'checked'
							: ''}"
						onclick={() => {
							if (!item.disabled && item.action) {
								item.action(target);
							}
							closeMenu();
						}}
						onmouseover={(e) => {
							if (item.submenu) {
								activeSubMenu.items = item.submenu(target);
								activeSubMenu.offsetX = offsetX + (menuDiv ? menuDiv.offsetWidth : 0);
								activeSubMenu.offsetY =
									offsetY +
									(menuDiv
										? menuDiv.children[
												Array.from(menuDiv.children).indexOf(e.currentTarget as Element)
											].getBoundingClientRect().top - menuDiv.getBoundingClientRect().top
										: 0);
							} else {
								activeSubMenu.items = null;
								activeSubMenu.offsetX = 0;
								activeSubMenu.offsetY = 0;
							}
						}}
					>
						<span>{item.icon}</span>{item.label}

						{#if item.submenu}
							<span style="float: right;">⭬</span>
						{/if}
					</button>
				{/if}
			{/if}
		{/each}
	</div>
{/if}

{#if showMenu && activeSubMenu.items && activeSubMenu.items.length > 0}
	<div bind:this={submenuDiv} class="submenu-container">
		<Self
			submenu={activeSubMenu.items}
			offsetX={activeSubMenu.offsetX}
			offsetY={activeSubMenu.offsetY}
		></Self>
	</div>
{/if}

<style>
	.context-menu {
		position: fixed;
		top: var(--x);
		left: var(--y);
		background-color: rgb(30, 30, 30);
		border: 1px solid var(--border-color);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
		z-index: 1000;
		display: flex;
		flex-direction: column;
		border-radius: 0.3em;
		min-width: 150px;
	}

	.context-menu-item {
		background: none;
		border: none;
		text-align: left;
		padding: 0.3rem;
		cursor: pointer;
		color: var(--text-color);
		font-size: 0.8rem;
		transition: background-color 0.2s ease;
	}

	.context-menu-item.disabled {
		color: rgba(from var(--text-color) r g b / 40%);
		cursor: default;
		user-select: none;
	}

	.context-menu-item.checked::before {
		content: '✓ ';
		margin-right: 0.25rem;
	}

	.context-menu-item:hover {
		background-color: rgba(from var(--panel-bg-color) r g b / 10%);
	}

	.context-menu span {
		margin-right: 0.25rem;
	}

	hr {
		margin-top: 0.2rem;
		border: none;
		border-top: 1px solid var(--border-color);
	}

	.submenu-container {
		position: fixed;
	}
</style>
