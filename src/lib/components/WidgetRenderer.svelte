<script lang="ts">
	import SliderWidgetView from '$lib/components/widgets/SliderWidget.svelte';
	import IntStepperWidgetView from '$lib/components/widgets/IntStepperWidget.svelte';
	import TextFieldWidgetView from '$lib/components/widgets/TextFieldWidget.svelte';
	import ColorPickerWidgetView from '$lib/components/widgets/ColorPickerWidget.svelte';
	import RotaryWidgetView from '$lib/components/widgets/RotaryWidget.svelte';
	import ToggleWidgetView from '$lib/components/widgets/ToggleWidget.svelte';
	import CheckboxWidgetView from '$lib/components/widgets/CheckboxWidget.svelte';
	import ButtonWidgetView from '$lib/components/widgets/ButtonWidget.svelte';
	import MomentaryButtonWidgetView from '$lib/components/widgets/MomentaryButtonWidget.svelte';

	import type {
		ContainerWidget,
		SliderWidget,
		Widget,
		MetaBindingKey,
		LayoutType,
		ToggleWidget,
		MomentaryButtonWidget,
		ColorPickerWidget
	} from '$lib/types/widgets';
	import type { OscValueType } from '$lib/services/oscquery';
	import {
		literal,
		oscBinding,
		resolveBinding,
		type Binding,
		type BindingContext,
		type BindingValue
	} from '$lib/types/binding';
	import { get } from 'svelte/store';
	import { bindingContext } from '$lib/stores/runtime';
	import {
		activeDragOperation,
		draggingWidgetId,
		activeContainerDropTarget,
		type ActiveContainerDropTarget,
		type WidgetMoveDrag,
		type WidgetTemplateDrag,
		type OscNodeDrag,
		type DragIntent
	} from '$lib/stores/drag';
	import {
		createDragData,
		pragmaticDraggable,
		pragmaticDropTarget,
		extractDragIntent,
		type PragmaticDraggableConfig,
		type PragmaticDropTargetConfig
	} from '$lib/drag/pragmatic';
	import {
		insertWidgetInstance,
		moveWidget,
		propagateWidgetValue,
		selectWidget,
		setWidgetLiteralValue,
		createWidget
	} from '$lib/stores/boards';
	import { createId } from '$lib/utils/ids';
	import { editorMode } from '$lib/stores/ui';
	import type { EditorMode } from '$lib/stores/ui';

	export let widget: Widget;
	export let selectedId: string | undefined;
	export let rootId: string;
	export let depth = 0;

	let ctx: BindingContext = { oscValues: {}, widgetValues: {}, functions: {} };
	$: ctx = $bindingContext;
	let value: BindingValue = null;
	$: value = resolveBinding(widget.value, ctx) ?? null;
	let containerWidget: ContainerWidget | null = null;
	$: containerWidget = widget.type === 'container' ? (widget as ContainerWidget) : null;
	let containerBodyRef: HTMLDivElement | null = null;
	$: if (!containerWidget) {
		containerBodyRef = null;
	}
	let draggingId: string | null = null;
	$: draggingId = $draggingWidgetId;
	let activeDropTarget: ActiveContainerDropTarget | null = null;
	let isDropPreviewOwner = false;
	let visibleGapTargets = false;
	let dropActiveFlag = false;
	$: activeDropTarget = $activeContainerDropTarget;
	$: isDropPreviewOwner = (activeDropTarget?.id ?? null) === widget.id;
	$: visibleGapTargets = showGapTargets && isDropPreviewOwner;
	$: dropActiveFlag = isDropPreviewOwner && isContainerDropActive;

	// If this instance is no longer the preview owner, ensure any visual
	// placeholder state is cleared so stale placeholders don't remain visible
	// when another nested container owns the preview or after a drop.
	$: if (!isDropPreviewOwner) {
		activeGapIndex = null;
		isContainerDropActive = false;
	}
	$: mode = $editorMode;
	let isEditMode = mode === 'edit';
	$: isEditMode = mode === 'edit';
	let isDragSource = false;
	$: isDragSource = isEditMode && draggingId === widget.id;
	let isSelected = false;
	$: isSelected = isEditMode && widget.id === selectedId;
	let isRootWidget = false;
	$: isRootWidget = widget.id === rootId;
	let showContainerLabel = false;
	$: showContainerLabel = containerWidget
		? resolveContainerLabelVisibility(containerWidget, ctx, isRootWidget)
		: false;
	let widgetClassName = 'widget';
	$: widgetClassName = [
		'widget',
		isSelected ? 'selected' : '',
		isRootWidget ? 'widget-root-container' : ''
	]
		.filter(Boolean)
		.join(' ');
	const horizontalLikeLayouts: LayoutType[] = ['horizontal', 'fixed-grid', 'smart-grid'];
	const gapLayouts: LayoutType[] = ['vertical', 'horizontal'];
	$: containerGapEnabled = !!containerWidget && gapLayouts.includes(containerWidget.layout);
	$: containerDropAxis =
		containerWidget && horizontalLikeLayouts.includes(containerWidget.layout)
			? 'horizontal'
			: 'vertical';
	let widgetDraggableConfig: PragmaticDraggableConfig | undefined;
	let containerDropTargetConfig: PragmaticDropTargetConfig | undefined;
	$: widgetDraggableConfig = (isEditMode, buildWidgetDraggableConfig());
	$: containerDropTargetConfig = (isEditMode, containerWidget, buildContainerDropTargetConfig());
	let activeGapIndex: number | null = null;
	let showGapTargets = false;
	let isContainerDropActive = false;
	let pendingPlacement: ContainerPlacement = createInsidePlacement();
	let dropPreviewResetHandle: number | null = null;
	$: showGapTargets = isEditMode && containerGapEnabled;
	$: if (!showGapTargets) {
		activeGapIndex = null;
		if (activeDropTarget?.id === widget.id) {
			activeContainerDropTarget.set(null);
		}
	}
	$: if (!containerWidget || !isEditMode) {
		isContainerDropActive = false;
	}
	$: metaLabel = resolveMetaField('label', widget.label, ctx);
	$: metaId = resolveMetaField('id', widget.id, ctx);
	$: metaType = resolveMetaField('type', widget.type, ctx);

	type OscDropPayload = {
		path: string;
		min?: number;
		max?: number;
		step?: number;
		name?: string;
		description?: string;
		enumValues?: (string | number)[];
		default?: BindingValue;
		type?: OscValueType;
	};

	const ensureString = (value: unknown): string | undefined =>
		typeof value === 'string' && value.trim().length ? value : undefined;

	const ensureNumber = (value: unknown): number | undefined =>
		typeof value === 'number' && Number.isFinite(value) ? value : undefined;

	const ensureEnumValues = (value: unknown): (string | number)[] | undefined => {
		if (!Array.isArray(value)) return undefined;
		const filtered = value.filter(
			(item): item is string | number => typeof item === 'string' || typeof item === 'number'
		);
		return filtered.length ? filtered : undefined;
	};

	const buildOscPayloadFromIntent = (intent: OscNodeDrag): OscDropPayload => {
		const meta = intent.meta ?? {};
		const typeValue = intent.osctype ?? (ensureString(meta.type) as OscValueType | undefined);
		return {
			path: intent.path,
			name: ensureString(meta.name ?? meta.label),
			description: ensureString(meta.description),
			min: ensureNumber(meta.min),
			max: ensureNumber(meta.max),
			step: ensureNumber(meta.step),
			enumValues: ensureEnumValues(meta.enumValues),
			default: meta.default as BindingValue | undefined,
			type: typeValue as OscValueType | undefined
		};
	};

	const resolveMetaField = (
		key: MetaBindingKey,
		fallback: string,
		context: BindingContext
	): string => {
		const binding = widget.meta?.[key];
		if (!binding) return fallback;
		const resolved = resolveBinding(binding, context);
		if (resolved === null || resolved === undefined) {
			return fallback;
		}
		return String(resolved);
	};

	const childLabel = (node: Widget, context: BindingContext): string => {
		const binding = node.meta?.label;
		if (!binding) return node.label;
		const resolved = resolveBinding(binding, context);
		return resolved === null || resolved === undefined ? node.label : String(resolved);
	};

	const buildWidgetMoveIntent = (): WidgetMoveDrag => ({
		kind: 'widget-move',
		widgetId: widget.id
	});

	const buildWidgetDraggableConfig = (): PragmaticDraggableConfig | undefined => {
		if (!isEditMode || widget.id === rootId) {
			return undefined;
		}
		const intent = buildWidgetMoveIntent();
		return {
			enabled: true,
			getInitialData: () => createDragData(intent),
			events: {
				onDragStart: () => {
					draggingWidgetId.set(widget.id);
					activeDragOperation.set({ intent, origin: 'canvas' });
				},
				onDrop: () => {
					draggingWidgetId.set(null);
					activeDragOperation.set(null);
					resetDropPreview();
				}
			}
		};
	};

	const buildContainerDropTargetConfig = (): PragmaticDropTargetConfig | undefined => {
		if (!containerWidget || !isEditMode) {
			return undefined;
		}
		return {
			enabled: true,
			events: {
				onDragEnter: handleContainerDragPreview,
				onDragLeave: () => resetDropPreview(),
				onDropTargetChange: handleContainerDragPreview,
				onDrop: handleContainerDrop
			}
		};
	};

	const resolveContainerLabelVisibility = (
		container: ContainerWidget,
		context: BindingContext,
		isRoot: boolean
	): boolean => {
		const binding = container.props?.showLabel;
		if (binding) {
			const resolved = resolveBinding(binding, context);
			if (typeof resolved === 'boolean') return resolved;
			if (typeof resolved === 'number') return resolved !== 0;
			if (typeof resolved === 'string') {
				const normalized = resolved.trim().toLowerCase();
				if (!normalized) return !isRoot;
				return normalized !== 'false' && normalized !== '0';
			}
		}
		return isRoot ? false : true;
	};

	const handleValueInput = (next: number | string | boolean) => {
		if (isEditMode) return;
		if (typeof next === 'number' && Number.isNaN(next)) {
			return;
		}
		if (widget.value.kind === 'literal') {
			setWidgetLiteralValue(widget.id, next as BindingValue);
		} else {
			propagateWidgetValue(widget.id, widget.value, next);
		}
	};

	const handleStringInput = (next: string) => {
		if (isEditMode) return;
		if (widget.value.kind === 'literal') {
			setWidgetLiteralValue(widget.id, next);
		} else {
			propagateWidgetValue(widget.id, widget.value, next);
		}
	};

	type PointerPosition = { clientX: number; clientY: number };

	type DropLocationPayload = {
		location: {
			current: {
				input?: PointerPosition | null;
				center?: { x: number; y: number } | null;
			};
		};
	};

	const resolvePointerPosition = (payload: DropLocationPayload): PointerPosition | null => {
		const input = payload.location.current.input;
		if (input && typeof input.clientX === 'number' && typeof input.clientY === 'number') {
			return { clientX: input.clientX, clientY: input.clientY };
		}
		const center = payload.location.current.center;
		if (center && typeof center.x === 'number' && typeof center.y === 'number') {
			return { clientX: center.x, clientY: center.y };
		}
		return null;
	};

	const isContainerDragIntent = (
		intent: DragIntent
	): intent is WidgetMoveDrag | WidgetTemplateDrag | OscNodeDrag => {
		return (
			intent.kind === 'widget-move' ||
			intent.kind === 'widget-template' ||
			intent.kind === 'osc-node'
		);
	};

	const handleContainerDragPreview = (
		payload: { source: { data?: Record<string, unknown> } } & DropLocationPayload
	) => {
		if (!containerWidget) return;
		cancelDropPreviewReset();
		const intent = extractDragIntent(payload.source.data);
		if (!intent || !isContainerDragIntent(intent)) return;
		const pointer = resolvePointerPosition(payload);
		updatePlacementPreview(pointer);
	};

	const handleContainerDrop = (
		payload: { source: { data?: Record<string, unknown> } } & DropLocationPayload
	) => {
		if (!containerWidget) return;
		cancelDropPreviewReset();
		const intent = extractDragIntent(payload.source.data);
		if (!intent) {
			resetDropPreview();
			return;
		}
		if (!beginDropHandling()) {
			return;
		}
		try {
			const pointer = resolvePointerPosition(payload);
			const placement: ContainerPlacement = isContainerDropActive
				? pendingPlacement
				: pointer
					? resolveContainerPlacementFromPoint(pointer)
					: createInsidePlacement();
			pendingPlacement = placement;
			if (intent.kind === 'widget-move') {
				applyWidgetMoveIntent(intent, placement);
			} else if (intent.kind === 'widget-template') {
				applyWidgetTemplateIntent(intent, placement);
			} else if (intent.kind === 'osc-node') {
				applyOscNodeIntent(intent, placement);
			}
			resetDropPreview(false);
		} finally {
			finishDropHandling();
		}
	};

	const applyWidgetMoveIntent = (intent: WidgetMoveDrag, placement: ContainerPlacement | null) => {
		if (!containerWidget) return;
		if (!placement || placement.type === 'inside') {
			moveWidget(intent.widgetId, widget.id, 'inside');
			return;
		}
		if (placement.targetId === intent.widgetId) return;
		moveWidget(intent.widgetId, placement.targetId, placement.type);
	};

	const applyWidgetTemplateIntent = (
		intent: WidgetTemplateDrag,
		placement: ContainerPlacement | null
	) => {
		if (!containerWidget) return;
		const instantiated = instantiateWidgetFromTemplateIntent(intent);
		if (!instantiated) return;
		insertWidgetInstance(instantiated, widget.id);
		if (placement && placement.type !== 'inside') {
			applyContainerPlacement(instantiated.id, placement);
		}
	};

	const instantiateWidgetFromTemplateIntent = (intent: WidgetTemplateDrag): Widget | null => {
		if (intent.template) {
			const clone = structuredClone(intent.template);
			clone.id = createId(clone.type);
			if (intent.label) {
				clone.label = intent.label;
			}
			return clone;
		}
		if (intent.widgetKind) {
			const created = createWidget(intent.widgetKind);
			if (intent.label) {
				created.label = intent.label;
			}
			return created;
		}
		return null;
	};

	const applyOscNodeIntent = (intent: OscNodeDrag, placement: ContainerPlacement | null) => {
		if (!containerWidget) return;
		const oscPayload = buildOscPayloadFromIntent(intent);
		const newWidget = createWidgetFromOsc(oscPayload);
		insertWidgetInstance(newWidget, widget.id);
		if (placement && placement.type !== 'inside') {
			applyContainerPlacement(newWidget.id, placement);
		}
	};

	const updatePlacementPreview = (point: PointerPosition | null) => {
		if (!containerWidget) return;
		if (!claimDropPreviewOwnership()) {
			isContainerDropActive = false;
			activeGapIndex = null;
			return;
		}
		isContainerDropActive = true;
		const placement: ContainerPlacement = point
			? resolveContainerPlacementFromPoint(point)
			: createInsidePlacement();
		pendingPlacement = placement;
		activeGapIndex = placementToGapIndex(placement);
	};

	const resetDropPreview = (releaseOwnership = true) => {
		cancelDropPreviewReset();
		isContainerDropActive = false;
		activeGapIndex = null;
		pendingPlacement = createInsidePlacement();
		if (releaseOwnership) {
			releaseDropPreviewOwnership();
		}
	};

	type ContainerPlacement = { type: 'inside' } | { type: 'before' | 'after'; targetId: string };

	function createInsidePlacement(): ContainerPlacement {
		return { type: 'inside' };
	}

	let dropHandlingOwner: string | null = null;

	const runAfterDrop = (callback: () => void) => {
		if (typeof queueMicrotask === 'function') {
			queueMicrotask(callback);
		} else {
			Promise.resolve().then(callback);
		}
	};

	function claimDropPreviewOwnership(): boolean {
		const current = get(activeContainerDropTarget);
		if (current && current.id !== widget.id && current.depth > depth) {
			return false;
		}
		activeContainerDropTarget.set({ id: widget.id, depth });
		return true;
	}

	function releaseDropPreviewOwnership(ownerId = widget.id): void {
		const current = get(activeContainerDropTarget);
		if (current?.id === ownerId) {
			activeContainerDropTarget.set(null);
		}
	}

	function beginDropHandling(): boolean {
		const current = get(activeContainerDropTarget);
		if (current && current.id !== widget.id) {
			return false;
		}
		if (dropHandlingOwner && dropHandlingOwner !== widget.id) {
			return false;
		}
		dropHandlingOwner = widget.id;
		return true;
	}

	function finishDropHandling(ownerId = widget.id): void {
		runAfterDrop(() => {
			if (dropHandlingOwner === ownerId) {
				dropHandlingOwner = null;
			}
			releaseDropPreviewOwnership(ownerId);
		});
	}

	const resolveContainerPlacementFromPoint = (
		point: PointerPosition | null
	): ContainerPlacement => {
		if (!containerWidget || !containerBodyRef || !point) {
			return { type: 'inside' };
		}
		const host = containerBodyRef as HTMLElement;
		const widgetElements = (
			Array.from(host.querySelectorAll(':scope > .widget')) as HTMLElement[]
		).filter((element) => {
			const elementId = element.dataset.widgetId;
			if (!elementId) return false;
			if (draggingId && elementId === draggingId) {
				return false;
			}
			return true;
		});
		if (!widgetElements.length) {
			return { type: 'inside' };
		}
		const pointerValue = containerDropAxis === 'horizontal' ? point.clientX : point.clientY;
		for (const element of widgetElements) {
			const targetId = element.dataset.widgetId;
			if (!targetId) continue;
			const rect = element.getBoundingClientRect();
			const threshold =
				containerDropAxis === 'horizontal'
					? rect.left + rect.width / 2
					: rect.top + rect.height / 2;
			if (pointerValue < threshold) {
				return { type: 'before', targetId };
			}
		}
		const last = widgetElements[widgetElements.length - 1];
		const lastId = last?.dataset.widgetId;
		return lastId ? { type: 'after', targetId: lastId } : { type: 'inside' };
	};

	const placementToGapIndex = (placement: ContainerPlacement | null): number | null => {
		if (!containerWidget) return null;
		const children = containerWidget.children;
		if (!children.length) return 0;
		if (!placement) return null;
		if (placement.type === 'inside') {
			return children.length;
		}
		const index = children.findIndex((child) => child.id === placement.targetId);
		if (index === -1) return null;
		return placement.type === 'before' ? index : index + 1;
	};

	const applyContainerPlacement = (newWidgetId: string, placement: ContainerPlacement) => {
		if (placement.type === 'inside') return;
		if (placement.targetId === newWidgetId) return;
		moveWidget(newWidgetId, placement.targetId, placement.type);
	};

	const hasActiveContainerIntent = (): boolean => {
		const active = get(activeDragOperation);
		if (!active) return false;
		return isContainerDragIntent(active.intent);
	};

	const handleNativeDragOver = (event: DragEvent) => {
		if (!isEditMode || !containerWidget) return;
		if (!hasActiveContainerIntent()) return;
		event.preventDefault();
		event.stopPropagation();
		updatePlacementPreview({ clientX: event.clientX, clientY: event.clientY });
	};

	const handleNativeDragLeave = (event: DragEvent) => {
		if (!isEditMode || !containerWidget) return;
		if (!hasActiveContainerIntent()) return;
		const current = event.currentTarget as HTMLElement | null;
		const related = event.relatedTarget as Node | null;
		if (current && related && current.contains(related)) {
			return;
		}
		event.stopPropagation();
		scheduleDropPreviewReset();
	};

	const handleNativeDrop = (event: DragEvent) => {
		if (!isEditMode || !containerWidget) return;
		if (!hasActiveContainerIntent()) return;
		event.preventDefault();
		event.stopPropagation();
	};

	let selectedTab = '';
	function scheduleDropPreviewReset() {
		cancelDropPreviewReset();
		if (typeof window === 'undefined') {
			resetDropPreview();
			return;
		}
		dropPreviewResetHandle = window.requestAnimationFrame(() => {
			dropPreviewResetHandle = null;
			resetDropPreview();
		});
	}

	function cancelDropPreviewReset() {
		if (dropPreviewResetHandle !== null && typeof window !== 'undefined') {
			window.cancelAnimationFrame(dropPreviewResetHandle);
		}
		dropPreviewResetHandle = null;
	}
	$: if (containerWidget?.layout === 'tabs') {
		if (!selectedTab) {
			selectedTab = containerWidget.children[0]?.id ?? '';
		} else {
			const exists = containerWidget.children.some((child) => child.id === selectedTab);
			if (!exists) {
				selectedTab = containerWidget.children[0]?.id ?? '';
			}
		}
	} else {
		selectedTab = '';
	}

	const sliderTemplate: SliderWidget = {
		id: createId('slider'),
		type: 'slider',
		label: 'Slider',
		value: literal(0),
		props: { min: literal(0), max: literal(1), step: literal(0.01) },
		css: ''
	};

	const toggleTemplate: ToggleWidget = {
		id: createId('toggle'),
		type: 'toggle',
		label: 'Toggle',
		value: literal(false),
		props: {},
		css: ''
	};

	const momentaryTemplate: MomentaryButtonWidget = {
		id: createId('momentary'),
		type: 'momentary-button',
		label: 'Trigger',
		value: literal(false),
		props: {},
		css: ''
	};

	const colorTemplate: ColorPickerWidget = {
		id: createId('color'),
		type: 'color-picker',
		label: 'Color',
		value: literal('#ffffff'),
		props: {},
		css: ''
	};

	const createWidgetFromOsc = (osc: OscDropPayload): Widget => {
		const label = osc.name ?? osc.description ?? osc.path;
		if (osc.type === 'boolean') {
			const toggle = structuredClone(toggleTemplate);
			toggle.id = createId('toggle');
			toggle.label = label;
			toggle.value = oscBinding(osc.path);
			return toggle;
		}
		if (osc.type === 'trigger') {
			const button = structuredClone(momentaryTemplate);
			button.id = createId('momentary');
			button.label = label;
			button.value = oscBinding(osc.path);
			return button;
		}
		if (osc.type === 'color') {
			const picker = structuredClone(colorTemplate);
			picker.id = createId('color');
			picker.label = label;
			picker.value = oscBinding(osc.path);
			return picker;
		}
		const slider = structuredClone(sliderTemplate);
		slider.id = createId('slider');
		slider.label = label;
		slider.value = oscBinding(osc.path);
		slider.props.min = literal(osc.min ?? 0);
		slider.props.max = literal(osc.max ?? 1);
		slider.props.step = literal(osc.step ?? 0.01);
		return slider;
	};
</script>

<div
	class={widgetClassName}
	data-widget-id={widget.id}
	data-drag-role={isDragSource ? 'source' : undefined}
	data-mode={isEditMode ? 'edit' : 'live'}
	data-meta-id={metaId}
	data-meta-type={metaType}
	role="button"
	tabindex="0"
	use:pragmaticDraggable={widgetDraggableConfig}
	on:click={(event) => {
		if (!isEditMode) return;
		event.stopPropagation();
		selectWidget(widget.id);
	}}
	on:keydown={(event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			if (!isEditMode) return;
			event.preventDefault();
			selectWidget(widget.id);
		}
	}}
>
	{#if containerWidget}
		{#if showContainerLabel}
			<div class="widget-header">
				<h4>{metaLabel}</h4>
			</div>
		{/if}
		<div
			class={`container-body layout-${containerWidget.layout} ${visibleGapTargets ? 'has-drop-gaps' : ''}`}
			data-drop-active={dropActiveFlag ? 'true' : undefined}
			bind:this={containerBodyRef}
			use:pragmaticDropTarget={containerDropTargetConfig}
			role="group"
			on:dragover={handleNativeDragOver}
			on:dragleave={handleNativeDragLeave}
			on:drop={handleNativeDrop}
		>
			{#if containerWidget.layout === 'tabs'}
				<div class="tabs">
					{#each containerWidget.children as child (child.id)}
						<button
							class:selected={child.id === selectedTab}
							on:click={() => (selectedTab = child.id)}>{childLabel(child, ctx)}</button
						>
					{/each}
				</div>
				{#if selectedTab}
					{#each containerWidget.children as child (child.id)}
						{#if child.id === selectedTab}
							<svelte:self widget={child} {selectedId} {rootId} depth={depth + 1} />
						{/if}
					{/each}
				{/if}
			{:else if containerWidget.layout === 'accordion'}
				{#each containerWidget.children as child (child.id)}
					<details open>
						<summary>{childLabel(child, ctx)}</summary>
						<svelte:self widget={child} {selectedId} {rootId} depth={depth + 1} />
					</details>
				{/each}
			{:else}
				{#if visibleGapTargets}
					<div
						class={`drop-placeholder drop-placeholder-${containerDropAxis}`}
						data-active={activeGapIndex === 0 ? 'true' : undefined}
					></div>
				{/if}
				{#each containerWidget.children as child, index (child.id)}
					<svelte:self widget={child} {selectedId} {rootId} depth={depth + 1}  />
					{#if visibleGapTargets}
					<div
						class={`drop-placeholder drop-placeholder-${containerDropAxis}`}
						data-active={activeGapIndex === index + 1 ? 'true' : undefined}
						role="presentation"
					></div>
					{/if}
				{/each}
			{/if}
		</div>
	{:else if widget.type === 'slider'}
		<div class="widget-slider">
			<SliderWidgetView
				{widget}
				{ctx}
				{isEditMode}
				label={metaLabel}
				value={value as number | string | null}
				onChange={handleValueInput}
			/>
		</div>
	{:else if widget.type === 'button'}
		<div class="widget-button-block">
			<!-- <span class="widget-label widget-label-stack">{metaLabel}</span> -->
			<ButtonWidgetView
				{widget}
				{isEditMode}
				{value}
				label={metaLabel}
				onChange={handleValueInput}
			/>
		</div>
	{:else if widget.type === 'momentary-button'}
		<div class="widget-button-block">
			<!-- <span class="widget-label widget-label-stack">{metaLabel}</span> -->
			<MomentaryButtonWidgetView
				{widget}
				{isEditMode}
				{value}
				label={metaLabel}
				onChange={handleValueInput}
			/>
		</div>
	{:else}
		<div class="widget-inline">
			<span class="widget-label">{metaLabel}</span>
			{#if widget.type === 'int-stepper'}
				<IntStepperWidgetView
					{widget}
					{ctx}
					{isEditMode}
					value={value as number | string | null}
					onChange={handleValueInput}
				/>
			{:else if widget.type === 'text-field'}
				<TextFieldWidgetView {isEditMode} value={value ?? ''} onInput={handleStringInput} />
			{:else if widget.type === 'color-picker'}
				<ColorPickerWidgetView
					{isEditMode}
					value={value ?? '#ffffff'}
					onInput={handleStringInput}
				/>
			{:else if widget.type === 'rotary'}
				<RotaryWidgetView
					{widget}
					{ctx}
					{isEditMode}
					value={value as number | string | null}
					onChange={handleValueInput}
				/>
			{:else if widget.type === 'toggle'}
				<ToggleWidgetView
					{widget}
					{isEditMode}
					{value}
					label={metaLabel}
					onChange={handleValueInput}
				/>
			{:else if widget.type === 'checkbox'}
				<CheckboxWidgetView
					{widget}
					{isEditMode}
					{value}
					label={metaLabel}
					onChange={handleValueInput}
				/>
			{/if}
		</div>
	{/if}
</div>

<style>
	.widget-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.35rem;
	}

	.widget-header h4 {
		margin: 0;
		font-size: 0.88rem;
		font-weight: 600;
	}

	.widget-inline {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.widget-label {
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		/* text-transform: uppercase; */
		color: var(--muted);
		flex: 0 0 130px;
		white-space: nowrap;
	}

	.widget-control {
		flex: 1;
		min-width: 0;
	}

	.widget-slider {
		width: 100%;
		display: block;
		padding: 0.1rem 0;
	}

	.widget-button-block {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.widget-label-stack {
		flex: none;
		width: auto;
		white-space: normal;
	}

	:global(.widget[data-mode='edit'] input:disabled),
	:global(.widget[data-mode='edit'] .rotary input:disabled) {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.container-body {
		width: 100%;
		height: 100%;
		min-width: 1rem;
		min-height:1rem;

		display: flex;
	}

	.container-body.has-drop-gaps {
		gap: 0;
	}

	.container-body[data-drop-active='true']:not(:global(.widget-root-container) > .container-body) {
		outline: 1px dashed rgba(245, 182, 76, 0.5);
		outline-offset: 4px;
		background: rgba(245, 182, 76, 0.05);
	}

	.container-body.layout-horizontal {
		flex-direction: row;
		flex-wrap: nowrap;
		align-items: stretch;
		justify-content: space-between;
	}

	:global(.container-body.layout-horizontal > .widget) {
		flex: 1 1 0;
		min-width: 0;
	}

	.container-body.layout-vertical {
		flex-direction: column;
	}

	.container-body.layout-fixed-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.container-body.layout-smart-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	}

	.container-body.layout-free {
		position: relative;
		flex-wrap: wrap;
	}

	.drop-placeholder {
		position: relative;
		flex: 1 1 auto;
		min-height: 0 rem;
		min-width: 0.4rem;
		transition:
			min-height 120ms ease,
			min-width 120ms ease,
			opacity 120ms ease;
		opacity: 0;
		flex-grow: 0;
	}

	.drop-placeholder-vertical {
		width: 100%;
		min-height: 0;
	}

	.drop-placeholder-horizontal {
		width: 0.5rem;
		height: auto;
		min-height: auto;
		align-self: stretch;
	}

	.drop-placeholder[data-active='true'] {
		min-height: 2.2rem;
		min-width: 2.2rem;
		margin: 0.3rem 0;
		opacity: 1;
		border: 1px dashed rgba(245, 182, 76, 0.6);
		border-radius: 8px;
		background: rgba(245, 182, 76, 0.15);
	}

	:global(.widget[data-drag-role='source']) {
		opacity: 0;
		pointer-events: none;
		margin: 0 !important;
		padding: 0 !important;
		border: none !important;
		overflow: hidden;
		display: none;
	}

	:global(.layout-horizontal) > .widget[data-drag-role='source'] {
		width: 0 !important;
	}

	:global(.layout-vertical) > .widget[data-drag-role='source'] {
		height: 0 !important;
	}

	:global(.widget[data-meta-type='container']) {
		display: flex;
		flex-direction: column;
	}

	:global(.widget[data-mode='edit']:not([data-meta-type='container'])) {
		cursor: pointer;
	}

	:global(.widget[data-mode='edit']:not([data-meta-type='container']) *) {
		pointer-events: none;
	}

	.tabs {
		display: flex;
		gap: 0.35rem;
		margin-bottom: 0.5rem;
	}

	.tabs button.selected {
		background: var(--accent);
		color: #0b0902;
	}
</style>
