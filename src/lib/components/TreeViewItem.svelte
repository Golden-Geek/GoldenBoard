<script lang="ts">
	import Self from './TreeViewItem.svelte';
	import { slide } from 'svelte/transition';
	import { dndState, startDrag, stopDrag } from '$lib/engine/draganddrop.svelte';

	let {
		node,
		level,
		showRoot = false,
		getChildren,
		getIcon = null,
		getTitle,
		getLabelStyle = null,
		getWarningsAndErrors = null,
		isContainer = null,
		highlightColor = '',
		onSelect = null,
		isSelected = null,
		contextMenu = null
	} = $props();

	let isExpanded: any = $derived(level < 3);

	let children: any = $derived(getChildren(node));
	let hasChildren: any = $derived(isContainer ? isContainer(node) : children.length > 0);

	let warningsAndErrors: any = $derived(getWarningsAndErrors ? getWarningsAndErrors(node) : []);

	let draggedNodes = $derived(dndState.draggingElements.map((d) => d.data));
	let isDragging = $derived(draggedNodes.length > 0);
	let dropPosition: 'before' | 'after' | null = $derived(
		dndState.dropCandidate?.target === node ? (dndState.dropCandidate?.position ?? null) : null
	);

	function shouldHandleDrag(e: DragEvent) {
		const targetEl = e.target as HTMLElement | null;
		const nearestTreeItem = targetEl?.closest('.treeview-item');
		if (nearestTreeItem && nearestTreeItem !== e.currentTarget) return false;

		const treeEl = e.currentTarget as HTMLElement;
		const childrenEl = treeEl.querySelector(':scope > .children') as HTMLElement | null;
		if (childrenEl) {
			const rect = childrenEl.getBoundingClientRect();
			const buffer = 4; // slight cushion so hovering between children counts as inside
			const insideChildren = e.clientY >= rect.top - buffer && e.clientY <= rect.bottom + buffer;
			if (insideChildren) return false;
		}

		return true;
	}

	function updateDropCandidateFromEvent(e: DragEvent) {
		if (!canShowDrop) return;
		if (!shouldHandleDrag(e)) {
			if (dndState.dropCandidate?.target === node) {
				dndState.dropCandidate = null;
			}
			return;
		}
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const midpoint = rect.top + rect.height / 2;
		const position: 'before' | 'after' = e.clientY < midpoint ? 'before' : 'after';
		dndState.dropCandidate = { type: 'tree-item', target: node, position };
	}

	function isDescendant(root: any, target: any) {
		if (!root || !getChildren) return false;
		const queue = [...(getChildren(root) ?? [])];
		while (queue.length) {
			const current = queue.shift();
			if (current === target) return true;
			const next = getChildren(current) ?? [];
			queue.push(...next);
		}
		return false;
	}

	let isSelfDrag = $derived(draggedNodes.includes(node));
	let isInsideDraggedNode = $derived(draggedNodes.some((dragged) => isDescendant(dragged, node)));
	let canShowDrop = $derived(level > 0 && isDragging && !isSelfDrag && !isInsideDraggedNode);

	function handleDragEnter(e: DragEvent) {
		if (!canShowDrop) return;
		updateDropCandidateFromEvent(e);
		e.preventDefault();
		e.stopPropagation();
	}

	function handleDragOver(e: DragEvent) {
		if (!canShowDrop) return;
		updateDropCandidateFromEvent(e);
		e.preventDefault();
		e.stopPropagation();
	}

	function handleDragLeave(e: DragEvent) {
		if (!canShowDrop) return;
		const next = e.relatedTarget as Node | null;
		if (next && (e.currentTarget as HTMLElement).contains(next)) return;
		if (dndState.dropCandidate?.target === node) {
			dndState.dropCandidate = null;
		}
		e.stopPropagation();
	}

	function handleTitleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			if (onSelect) {
				onSelect(node, e);
			}
			e.preventDefault();
		}
	}
</script>

<div class="treeview-wrapper">
	<div
		class="treeview-item {isExpanded ? 'expanded' : 'collapsed'} "
		style="{highlightColor != '' ? `--highlight-color: ${highlightColor}` : ''};"
		role="treeitem"
		aria-expanded={hasChildren ? isExpanded : undefined}
		aria-selected={isSelected ? isSelected(node) : undefined}
		tabindex="0"
		draggable={level > 0 ? 'true' : 'false'}
		ondragenter={handleDragEnter}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondragstart={(e) => {
			// give the browser required drag data (some browsers need this)
			e.dataTransfer?.setData('text/plain', 'tree-item');
			e.dataTransfer!.effectAllowed = 'move';
			startDrag([{ type: 'tree-item', htmlElement: e.currentTarget, data: node }]);

			//set img to this element, force a transparent background$
	
			e.dataTransfer?.setDragImage(e.currentTarget as HTMLElement, 10, 10);

			e.stopPropagation();
		}}
		ondragend={(e) => {
			dropPosition = null;
			stopDrag();
			e.preventDefault();
			e.stopPropagation();
		}}
	>
		{#if level > 0 || showRoot}
			<div
				class="title level-{level} {hasChildren ? 'container' : 'controllable'} {isSelected &&
				isSelected(node)
					? 'selected'
					: ''}"
				role="button"
				tabindex="0"
				oncontextmenu={(e) => {
					if (contextMenu) {
						contextMenu(node, e);
						e.preventDefault();
					}
				}}
				onclick={(e) => {
					if (onSelect) {
						onSelect(node, e);
					}
				}}
				onkeydown={handleTitleKeydown}
			>
				{#if hasChildren}
					<button
						class="expand-btn"
						aria-label={isExpanded ? 'Collapse' : 'Expand'}
						onclick={() => {
							isExpanded = !isExpanded;
						}}
					>
						{isExpanded ? '▾' : '▸'}
					</button>
				{/if}

				{#if getIcon}
					<span class="icon">
						{getIcon(node)}
					</span>
				{/if}
				<span style={getLabelStyle ? getLabelStyle(node) : ''}>{getTitle(node)}</span>
				{#if warningsAndErrors.length > 0}
					<span
						class="warnings-errors"
						title={(warningsAndErrors as Array<any>)
							.map(({ property, warningAndErrors }) =>
								Object.entries(warningAndErrors)
									.map(
										([key, issue]) =>
											`${(issue as { type: string; message: string }).type == 'warning' ? '⚠️' : '❌'} ${property.definition.name} > ${key} : ${(issue as { type: string; message: string }).message}`
									)
									.join('\n')
							)
							.join('\n')}
					>
						⚠️
					</span>
				{/if}
			</div>
		{/if}
		{#if isExpanded && node != null && hasChildren}
			<div
				class="children {level == 0 && !showRoot ? 'first-level' : ''}"
				transition:slide|local={{ duration: 300 }}
			>
				{#each children as child, index (child)}
					<div class="child-wrapper">
						<Self
							node={child}
							level={level + 1}
							{getChildren}
							{getIcon}
							{getTitle}
							{getLabelStyle}
							{getWarningsAndErrors}
							{isContainer}
							{highlightColor}
							{onSelect}
							{isSelected}
							{contextMenu}
						></Self>
					</div>
				{/each}
			</div>
		{/if}

		{#if canShowDrop && dropPosition}
			<div class={`drop-line ${dropPosition} active`} aria-hidden="true" role="separator"></div>
		{/if}
	</div>
</div>

<style>
	.treeview-item {
		--highlight-color: rgba(200, 200, 200);
		position: relative;
		background-color: transparent;
	}

	.treeview-item .title {
		font-size: 0.8rem;
		display: flex;
		align-items: center;
		cursor: pointer;
		user-select: none;
		display: inline;
		padding: 0.1rem 0.5rem;
		border-radius: 0.3rem;
		border: 1px solid transparent;
		transition: background-color 0.1s ease;
		color: rgba(from var(--text-color) r g b);
	}

	.treeview-item .title.container {
		font-weight: bold;
	}

	.treeview-item .title.level-1 {
		font-size: 0.9rem;
	}

	.treeview-item .title.selected {
		background-color: rgba(from var(--highlight-color) r g b / 30%) !important;
		border: 1px solid rgba(from var(--highlight-color) r g b / 80%);
	}

	.treeview-item .title:hover {
		background-color: rgba(from var(--highlight-color) r g b / 30%);
	}

	.treeview-item .title .icon {
		margin-right: 0.25rem;
		font-size: 0.9rem;
	}

	.treeview-item .expand-btn {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.8rem;
		margin-right: 0.25rem;
		padding: 0;
	}

	.treeview-item .children:not(.first-level) {
		margin-left: 0.7rem;
		padding-left: 0.1rem;
		border-left: solid 1px rgba(200, 200, 200, 0.2);
	}

	.treeview-wrapper {
		position: relative;
	}

	.child-wrapper {
		position: relative;
	}

	.drop-line {
		position: absolute;
		left: 0;
		right: 0;
		height: 0;
		border-top: 2px solid rgba(from var(--highlight-color) r g b / 85%);
		box-shadow: 0 0 4px rgba(from var(--highlight-color) r g b / 45%);
	}

	.drop-line.before {
		top: 0;
	}

	.drop-line.after {
		bottom: 0;
	}
</style>
