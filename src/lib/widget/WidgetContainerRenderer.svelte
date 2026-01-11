<script lang="ts">
	import { dndState } from '$lib/engine/draganddrop.svelte';
	import { handleWidgetDrop } from '$lib/engine/draganddrop.svelte';
	import { mainState, saveData } from '$lib/engine/engine.svelte';
	import AccordionWidget from './containers/AccordionWidget.svelte';
	import WidgetRenderer from './WidgetRenderer.svelte';
	import { selectedWidgets } from './widgets.svelte';
	import type { Property } from '$lib/property/property.svelte';
	import type { Widget } from './widgets.svelte';

	let { board, widget } = $props();
	let layout = $derived(widget.getSingleProp('layout')?.get());

	let showLabel = $derived(widget.getSingleProp('label.showLabel').get());
	let labelPlacement = $derived(widget.getSingleProp('label.labelPlacement').get());

	let type = $derived(widget.type);
	let editMode = $derived(mainState.editor.editMode);

	let containerEl = $state<HTMLElement | null>(null);
	let transformerRefreshTick = $state(0);

	function attachContainer(node: HTMLElement) {
		containerEl = node;
		const observer = new ResizeObserver(() => {
			if (!isTransforming) transformerRefreshTick++;
		});
		observer.observe(node);
		return () => {
			observer.disconnect();
			if (containerEl === node) containerEl = null;
		};
	}

	type Rect = { x: number; y: number; width: number; height: number };
	type Handle = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

	type PropSnapshot = {
		prop: Property;
		enabled: boolean;
		unit: string;
		canDisable: boolean;
	};

	type WidgetSnapshot = {
		widget: Widget;
		rect: Rect;
		props: {
			left: PropSnapshot | null;
			right: PropSnapshot | null;
			top: PropSnapshot | null;
			bottom: PropSnapshot | null;
			width: PropSnapshot;
			height: PropSnapshot;
		};
	};

	let selectedChildren = $derived(selectedWidgets.filter((child) => child.parent === widget));
	let transformerBox = $state<Rect | null>(null);
	let computedTransformerBox = $derived.by((): Rect | null => {
		transformerRefreshTick;
		selectedChildren;
		layout;
		editMode;
		if (!containerEl || layout !== 'free' || editMode !== 'edit') return null;
		if (selectedChildren.length === 0) return null;

		const containerRect = containerEl.getBoundingClientRect();
		let found = false;
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		for (const child of selectedChildren) {
			const el = containerEl.querySelector<HTMLElement>(
				`.widget-renderer[data-widget-id="${child.id}"]`
			);
			if (!el) continue;
			const rect = el.getBoundingClientRect();
			const x = rect.left - containerRect.left;
			const y = rect.top - containerRect.top;
			found = true;
			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			maxX = Math.max(maxX, x + rect.width);
			maxY = Math.max(maxY, y + rect.height);
		}

		if (!found) return null;
		return {
			x: minX,
			y: minY,
			width: Math.max(0, maxX - minX),
			height: Math.max(0, maxY - minY)
		};
	});
	let isTransforming = $state(false);
	let displayTransformerBox = $derived(isTransforming ? transformerBox : computedTransformerBox);
	let activeTransform: {
		handle: Handle;
		startPointer: { x: number; y: number };
		startBox: Rect;
		snapshots: WidgetSnapshot[];
		containerSize: { width: number; height: number };
	} | null = null;

	const handles: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

	function allowContainerDrop(e: DragEvent): boolean {
		if (layout === 'free') return true;
		const currentTarget = e.currentTarget as HTMLElement;
		const targetEl = e.target as HTMLElement | null;
		const rect = currentTarget.getBoundingClientRect();
		const edgeMargin = Math.min(32, Math.min(rect.width, rect.height) * 0.15);
		const nearEdge =
			e.clientX - rect.left < edgeMargin ||
			rect.right - e.clientX < edgeMargin ||
			e.clientY - rect.top < edgeMargin ||
			rect.bottom - e.clientY < edgeMargin;

		const hasChildren = (widget.children?.length ?? 0) > 0;
		const overChild = targetEl?.closest('.widget-renderer');
		// Allow dropping into empty containers anywhere; otherwise near borders or when not over a child
		if (!hasChildren) return true;
		if (nearEdge) return true;
		return !overChild;
	}

	function isDescendant(root: Widget, target: Widget): boolean {
		if (!root || !root.children) return false;
		const stack = [...(root.children ?? [])];
		while (stack.length) {
			const current = stack.pop();
			if (current === target) return true;
			if (current?.children) stack.push(...current.children);
		}
		return false;
	}

	let dropInto = $derived(
		dndState.dropCandidate?.type === 'widget' &&
			dndState.dropCandidate?.target === widget &&
			dndState.dropCandidate?.insertInto === true
	);

	let isDragging = $derived(dndState.draggingElements.length > 0);

	function updateFreeLayoutDropCandidate(e: DragEvent) {
		if (!containerEl) return;
		const dragged = dndState.draggingElements[0];
		if (!dragged) return;

		const containerRect = containerEl.getBoundingClientRect();
		const offset = dragged.pointerOffset ?? { x: 10, y: 10 };

		let widgetSize: { width: number; height: number } | undefined = undefined;
		if (dragged.type === 'widget' && dragged.htmlElement) {
			const r = (dragged.htmlElement as HTMLElement).getBoundingClientRect();
			widgetSize = { width: r.width, height: r.height };
		}

		dndState.dropCandidate = {
			type: 'widget',
			target: widget,
			insertInto: true,
			position: 'after',
			freeLayout: {
				left: e.clientX - containerRect.left - offset.x,
				top: e.clientY - containerRect.top - offset.y,
				containerSize: { width: containerRect.width, height: containerRect.height },
				widgetSize
			}
		};
	}

	function parseCssValue(value: unknown): { value: number; unit: string } {
		if (typeof value === 'number' && Number.isFinite(value)) {
			return { value, unit: 'px' };
		}
		const str = String(value ?? '').trim();
		const match = str.match(/^(-?[\d.]+)([a-z%]*)$/i);
		if (match) {
			return { value: parseFloat(match[1]), unit: match[2] || 'px' };
		}
		return { value: 0, unit: 'px' };
	}

	function toUnitValue(unit: string, valuePx: number, containerSize: number): string | number {
		const safeContainer = containerSize === 0 ? 1 : containerSize;
		const round = (v: number) => Math.round(v * 100) / 100;
		if (unit === '%') {
			return `${round((valuePx / safeContainer) * 100)}%`;
		}
		if (unit === 'px' || unit === '') {
			return round(valuePx);
		}
		return `${round(valuePx)}${unit}`;
	}

	function captureProp(prop: Property | null): PropSnapshot | null {
		if (!prop) return null;
		const { unit } = parseCssValue(prop.getRaw());
		const def: any = prop.definition;
		const canDisable = Boolean(def?.canDisable);
		const enabled = prop.enabled ?? !canDisable;
		return { prop, enabled, unit, canDisable };
	}

	function buildSnapshots(): WidgetSnapshot[] {
		if (!containerEl) return [];
		const containerRect = containerEl.getBoundingClientRect();
		const snaps: WidgetSnapshot[] = [];

		for (const child of selectedChildren) {
			const el = containerEl.querySelector<HTMLElement>(
				`.widget-renderer[data-widget-id="${child.id}"]`
			);
			if (!el) continue;
			const rect = el.getBoundingClientRect();
			const widthProp = captureProp(child.getSingleProp('position.width'));
			const heightProp = captureProp(child.getSingleProp('position.height'));
			if (!widthProp || !heightProp) continue;

			snaps.push({
				widget: child,
				rect: {
					x: rect.left - containerRect.left,
					y: rect.top - containerRect.top,
					width: rect.width,
					height: rect.height
				},
				props: {
					left: captureProp(child.getSingleProp('position.left')),
					right: captureProp(child.getSingleProp('position.right')),
					top: captureProp(child.getSingleProp('position.top')),
					bottom: captureProp(child.getSingleProp('position.bottom')),
					width: widthProp,
					height: heightProp
				}
			});
		}

		return snaps;
	}

	function computeNewBox(start: Rect, dx: number, dy: number, handle: Handle): Rect {
		const minSize = 4;
		let { x, y, width, height } = start;

		if (handle === 'move') {
			return { x: x + dx, y: y + dy, width, height };
		}

		if (handle.includes('e')) {
			width = Math.max(minSize, width + dx);
		}
		if (handle.includes('s')) {
			height = Math.max(minSize, height + dy);
		}
		if (handle.includes('w')) {
			const newWidth = Math.max(minSize, width - dx);
			x = x + width - newWidth;
			width = newWidth;
		}
		if (handle.includes('n')) {
			const newHeight = Math.max(minSize, height - dy);
			y = y + height - newHeight;
			height = newHeight;
		}

		return { x, y, width, height };
	}

	function updatePropValue(info: PropSnapshot | null, valuePx: number, containerSize: number) {
		if (!info) return;
		if (!Number.isFinite(valuePx)) return;
		if (info.canDisable && !info.enabled) return;
		info.prop.set(toUnitValue(info.unit, valuePx, containerSize) as any);
	}

	function applyRectToWidget(
		snapshot: WidgetSnapshot,
		rect: Rect,
		containerSize: { width: number; height: number }
	) {
		// If neither side anchor is enabled, enable left/top so we can preserve position.
		// This matches how free-layout positioning behaves (needs at least one anchor per axis).
		const left = snapshot.props.left;
		const right = snapshot.props.right;
		if (left?.canDisable && !left.enabled) {
			const rightDisabled = !right || (right.canDisable && !right.enabled);
			if (rightDisabled) {
				left.prop.enabled = true;
				left.enabled = true;
			}
		}

		const top = snapshot.props.top;
		const bottom = snapshot.props.bottom;
		if (top?.canDisable && !top.enabled) {
			const bottomDisabled = !bottom || (bottom.canDisable && !bottom.enabled);
			if (bottomDisabled) {
				top.prop.enabled = true;
				top.enabled = true;
			}
		}

		const cw = Math.max(1, containerSize.width);
		const ch = Math.max(1, containerSize.height);
		const widthPx = Math.max(0, rect.width);
		const heightPx = Math.max(0, rect.height);

		updatePropValue(snapshot.props.width, widthPx, cw);
		updatePropValue(snapshot.props.height, heightPx, ch);
		updatePropValue(snapshot.props.left, rect.x, cw);
		updatePropValue(snapshot.props.right, cw - rect.x - widthPx, cw);
		updatePropValue(snapshot.props.top, rect.y, ch);
		updatePropValue(snapshot.props.bottom, ch - rect.y - heightPx, ch);
	}

	function applyTransformWithPointer(clientX: number, clientY: number) {
		if (!activeTransform) return;
		const { handle, startPointer, startBox, snapshots, containerSize } = activeTransform;
		const dx = clientX - startPointer.x;
		const dy = clientY - startPointer.y;
		const newBox = computeNewBox(startBox, dx, dy, handle);
		const scaleX = newBox.width / Math.max(1, startBox.width);
		const scaleY = newBox.height / Math.max(1, startBox.height);

		for (const snap of snapshots) {
			const newRect: Rect = {
				x: newBox.x + (snap.rect.x - startBox.x) * scaleX,
				y: newBox.y + (snap.rect.y - startBox.y) * scaleY,
				width: snap.rect.width * scaleX,
				height: snap.rect.height * scaleY
			};
			applyRectToWidget(snap, newRect, containerSize);
		}

		transformerBox = newBox;
	}

	function startTransform(handle: Handle, event: PointerEvent) {
		if (layout !== 'free' || editMode !== 'edit') return;
		if (!displayTransformerBox || !containerEl) return;
		const snapshots = buildSnapshots();
		if (!snapshots.length) return;

		const containerRect = containerEl.getBoundingClientRect();
		activeTransform = {
			handle,
			startPointer: { x: event.clientX, y: event.clientY },
			startBox: displayTransformerBox,
			snapshots,
			containerSize: { width: containerRect.width, height: containerRect.height }
		};
		isTransforming = true;

		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', endTransform);
		window.addEventListener('pointercancel', endTransform);
		event.preventDefault();
		event.stopPropagation();
	}

	function handlePointerMove(event: PointerEvent) {
		if (!activeTransform) return;
		applyTransformWithPointer(event.clientX, event.clientY);
		// event.preventDefault();
	}

	function endTransform() {
		if (!activeTransform) return;
		window.removeEventListener('pointermove', handlePointerMove);
		window.removeEventListener('pointerup', endTransform);
		window.removeEventListener('pointercancel', endTransform);
		activeTransform = null;
		isTransforming = false;
		transformerBox = null;
		transformerRefreshTick++;
		saveData('Transform Widgets', { coalesceID: 'transform-widgets' });
	}
</script>

<div
	class="widget-container-renderer {isDragging ? 'dragging' : ''} {dropInto ? 'drop-into' : ''}"
	role="group"
	ondrop={(e) => {
		if (mainState.editor.editMode !== 'edit') return;
		if (dndState.dropCandidate?.type === 'widget' && dndState.dropCandidate?.target === widget) {
			handleWidgetDrop();
			e.preventDefault();
			e.stopPropagation();
		}
	}}
	ondragenter={(e) => {
		if (mainState.editor.editMode !== 'edit') return;
		const draggedEl = dndState.draggingElements[0];
		if (!draggedEl) return;
		if (layout === 'free') {
			updateFreeLayoutDropCandidate(e);
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		if (draggedEl.type === 'widget') {
			const dragged = draggedEl.data as Widget;
			if (dragged === widget || dragged.parent === widget || isDescendant(dragged, widget)) {
				if (dndState.dropCandidate?.target === widget) dndState.dropCandidate = null;
				return;
			}
		}
		if (!allowContainerDrop(e)) {
			if (dndState.dropCandidate?.target === widget) dndState.dropCandidate = null;
			return;
		}
		dndState.dropCandidate = {
			type: 'widget',
			target: widget,
			position: 'after',
			insertInto: true
		};
		e.preventDefault();
		e.stopPropagation();
	}}
	ondragover={(e) => {
		if (mainState.editor.editMode !== 'edit') return;
		const draggedEl = dndState.draggingElements[0];
		if (!draggedEl) return;
		if (layout === 'free') {
			updateFreeLayoutDropCandidate(e);
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		if (draggedEl.type === 'widget') {
			const dragged = draggedEl.data as Widget;
			if (dragged === widget || dragged.parent === widget || isDescendant(dragged, widget)) {
				if (dndState.dropCandidate?.target === widget) dndState.dropCandidate = null;
				return;
			}
		}
		if (!allowContainerDrop(e)) {
			if (dndState.dropCandidate?.target === widget) dndState.dropCandidate = null;
			return;
		}
		dndState.dropCandidate = {
			type: 'widget',
			target: widget,
			position: 'after',
			insertInto: true
		};
		e.preventDefault();
		e.stopPropagation();
	}}
	ondragleave={(e) => {
		if (dndState.dropCandidate?.target === widget && dndState.dropCandidate?.insertInto) {
			dndState.dropCandidate = null;
		}
	}}
>
	{#if showLabel && labelPlacement == 'inside'}
		<span class="widget-label" aria-hidden="true">{widget.name}</span>
	{/if}

	{#if type == 'accordion'}
		<AccordionWidget {board} {widget} {layout} {showLabel} {labelPlacement} />
	{:else if type == 'tabbedContainer'}{:else}
		<div class="widget-children-container layout-{layout}" {@attach attachContainer}>
			
			{#if layout === 'free' && editMode === 'edit' && displayTransformerBox && selectedChildren.length > 0}
				<div
					class="transformer"
					style={`transform: translate(${displayTransformerBox.x}px, ${displayTransformerBox.y}px); width: ${displayTransformerBox.width}px; height: ${displayTransformerBox.height}px;`}
					onpointerdown={(event) => startTransform('move', event)}
				>
					{#each handles as handle (handle)}
						<div
							class={`transformer-handle handle-${handle}`}
							onpointerdown={(event) => startTransform(handle, event)}
						></div>
					{/each}
				</div>
			{/if}

			{#each widget.children as childWidget (childWidget)}
				<WidgetRenderer {board} widget={childWidget} />
			{/each}
		</div>
	{/if}

	{#if dropInto}
		<div class="drop-into-overlay" aria-hidden="true"></div>
	{/if}
</div>

<style>
	.widget-container-renderer {
		width: 100%;
		height: 100%;
		position: relative;
		border: 0.05rem dashed var(--panel-bg-color);
		padding: 0.025rem;
		transition: padding 0.2s ease;
	}

	.widget-container-renderer.dragging {
		box-shadow: inset 0 0 12px rgba(from var(--widget-color) r g b / 35%);
		padding: 0.5rem;
	}

	.widget-container-renderer.drop-into {
		padding: 1.5rem;
	}

	.widget-label {
		position: absolute;
		top: 0.1rem;
		left: 0.1rem;
		font-size: 2rem;
		color: rgba(from var(--panel-bg-color) r g b / 6%);
		text-transform: uppercase;
		font-weight: bold;
		pointer-events: none;
		user-select: none;
	}

	.widget-children-container {
		width: 100%;
		height: 100%;
		display: flex;
		gap: 0.25rem;
		box-sizing: border-box;
	}

	.widget-children-container.layout-horizontal {
		flex-direction: row;
	}

	.widget-children-container.layout-vertical {
		flex-direction: column;
	}

	.widget-children-container.layout-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: 0.25rem;
		align-content: stretch;
		align-items: stretch;
		justify-items: stretch;
	}

	.widget-children-container.layout-free {
		display: block;
		position: relative;
		padding: 0.25rem;
		gap: 0;
	}

	.drop-into-overlay {
		position: absolute;
		inset: 0.5rem;
		background-color: rgba(from var(--widget-color) r g b / 15%);
		border-radius: 0.25rem;
		pointer-events: none;
	}

	.transformer {
		position: absolute;
		top: 0;
		left: 0;
		border: 0.125rem solid rgba(from var(--widget-color) r g b / 60%);
		border-radius: 0.35rem;
		box-shadow: 0 0 0.35rem rgba(from var(--widget-color) r g b / 30%);
		pointer-events: auto;
		box-sizing: border-box;
		cursor: move;
		z-index: 5;
	}

	.transformer::after {
		content: '';
		position: absolute;
		inset: 0;
		border: 0.1rem dashed rgba(from var(--widget-color) r g b / 40%);
		pointer-events: none;
		border-radius: 0.3rem;
	}

	.transformer-handle {
		position: absolute;
		width: 0.85rem;
		height: 0.85rem;
		background-color: rgba(from var(--panel-bg-color) r g b / 85%);
		border: 0.12rem solid var(--widget-color);
		border-radius: 999px;
		box-shadow: 0 0 0.3rem rgba(from var(--widget-color) r g b / 25%);
		pointer-events: auto;
	}

	.handle-nw {
		top: -0.45rem;
		left: -0.45rem;
		cursor: nwse-resize;
	}

	.handle-n {
		top: -0.45rem;
		left: 50%;
		transform: translateX(-50%);
		cursor: ns-resize;
	}

	.handle-ne {
		top: -0.45rem;
		right: -0.45rem;
		cursor: nesw-resize;
	}

	.handle-e {
		top: 50%;
		right: -0.45rem;
		transform: translateY(-50%);
		cursor: ew-resize;
	}

	.handle-se {
		bottom: -0.45rem;
		right: -0.45rem;
		cursor: nwse-resize;
	}

	.handle-s {
		bottom: -0.45rem;
		left: 50%;
		transform: translateX(-50%);
		cursor: ns-resize;
	}

	.handle-sw {
		bottom: -0.45rem;
		left: -0.45rem;
		cursor: nesw-resize;
	}

	.handle-w {
		top: 50%;
		left: -0.45rem;
		transform: translateY(-50%);
		cursor: ew-resize;
	}
</style>
