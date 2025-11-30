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
	import { literal, oscBinding, resolveBinding, type Binding, type BindingContext, type BindingValue } from '$lib/types/binding';
	import { bindingContext } from '$lib/stores/runtime';
	import {
		insertWidgetInstance,
		moveWidget,
		propagateWidgetValue,
		selectWidget,
		setWidgetLiteralValue
	} from '$lib/stores/boards';
	import { createId } from '$lib/utils/ids';
	import { editorMode } from '$lib/stores/ui';
	import type { EditorMode } from '$lib/stores/ui';

	export let widget: Widget;
	export let selectedId: string | undefined;
	export let rootId: string;
	export let parentLayout: LayoutType | undefined = undefined;

	let ctx: BindingContext = { oscValues: {}, widgetValues: {}, functions: {} };
	$: ctx = $bindingContext;
	let value: BindingValue = null;
	$: value = resolveBinding(widget.value, ctx) ?? null;
	let containerWidget: ContainerWidget | null = null;
	$: containerWidget = widget.type === 'container' ? (widget as ContainerWidget) : null;
	let isSelected = false;
	$: isSelected = isEditMode && widget.id === selectedId;
	let isRootWidget = false;
	$: isRootWidget = widget.id === rootId;
	let showContainerLabel = false;
	$: showContainerLabel = containerWidget
		? resolveContainerLabelVisibility(containerWidget, ctx, isRootWidget)
		: false;
	let widgetClassName = 'widget';
	$: widgetClassName = ['widget', isSelected ? 'selected' : '', isRootWidget ? 'widget-root-container' : '']
		.filter(Boolean)
		.join(' ');

	let mode: EditorMode = 'edit';
	$: mode = $editorMode;
	$: isEditMode = mode === 'edit';

	let metaLabel = widget.label;
	let metaId = widget.id;
	let metaType: string = widget.type;
	let dropIndicator: 'before' | 'after' | 'inside' | null = null;
	let isDraggable = false;
	let dropAxis: 'vertical' | 'horizontal' = 'vertical';
	const horizontalLikeLayouts: LayoutType[] = ['horizontal', 'fixed-grid', 'smart-grid'];
	const gapLayouts: LayoutType[] = ['vertical', 'horizontal'];
	$: dropAxis = parentLayout && horizontalLikeLayouts.includes(parentLayout) ? 'horizontal' : 'vertical';
	$: containerGapEnabled = !!containerWidget && gapLayouts.includes(containerWidget.layout);
	$: containerDropAxis = containerWidget && horizontalLikeLayouts.includes(containerWidget.layout) ? 'horizontal' : 'vertical';
	let activeGapIndex: number | null = null;
	let showGapTargets = false;
	$: showGapTargets = isEditMode && containerGapEnabled;
	$: if (!showGapTargets) {
		activeGapIndex = null;
	}
	$: metaLabel = resolveMetaField('label', widget.label, ctx);
	$: metaId = resolveMetaField('id', widget.id, ctx);
	$: metaType = resolveMetaField('type', widget.type, ctx);
	$: isDraggable = isEditMode && widget.id !== rootId;

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

	const resolveMetaField = (key: MetaBindingKey, fallback: string, context: BindingContext): string => {
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

	const handleDrop = (event: DragEvent) => {
		if (!isEditMode) return;
		const movePayload = event.dataTransfer?.getData('application/goldenboard-move');
		if (movePayload) {
			event.preventDefault();
			const hostRect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect();
			if (containerWidget) {
				dropIndicator = 'inside';
			} else if (hostRect) {
				dropIndicator = resolvePointerPosition(event, hostRect);
			}
			const { widgetId } = JSON.parse(movePayload) as { widgetId?: string };
			if (!widgetId || widgetId === widget.id) {
				dropIndicator = null;
				return;
			}
			if (containerWidget) {
				moveWidget(widgetId, widget.id, 'inside');
			} else {
				const position = resolvePointerPosition(event, hostRect);
				moveWidget(widgetId, widget.id, position);
			}
			dropIndicator = null;
			activeGapIndex = null;
			event.stopPropagation();
			return;
		}
		if (!containerWidget) {
			dropIndicator = null;
			activeGapIndex = null;
			event.stopPropagation();
			return;
		}
		event.preventDefault();
		const widgetPayload = event.dataTransfer?.getData('application/goldenboard-widget');
		if (widgetPayload) {
			const parsed = JSON.parse(widgetPayload) as Widget;
			parsed.id = createId(parsed.type);
			insertWidgetInstance(parsed, widget.id);
			dropIndicator = null;
			activeGapIndex = null;
			event.stopPropagation();
			return;
		}
		const oscPayload = event.dataTransfer?.getData('application/osc-node');
		if (oscPayload) {
			const osc = JSON.parse(oscPayload) as OscDropPayload;
			const newWidget = createWidgetFromOsc(osc);
			insertWidgetInstance(newWidget, widget.id);
			dropIndicator = null;
			activeGapIndex = null;
			event.stopPropagation();
		}
	};

	const handleDragOver = (event: DragEvent) => {
		if (!isEditMode) return;
		const types = Array.from(event.dataTransfer?.types ?? []);
		const isMove = types.includes('application/goldenboard-move');
		if (isMove) {
			event.preventDefault();
			event.dataTransfer && (event.dataTransfer.dropEffect = 'move');
			if (containerWidget) {
				dropIndicator = 'inside';
			} else {
				const rect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect();
				if (rect) {
					dropIndicator = resolvePointerPosition(event, rect);
				}
			}
			return;
		}
		if (!containerWidget) {
			if (types.includes('application/goldenboard-widget') || types.includes('application/osc-node')) {
				event.stopPropagation();
				dropIndicator = null;
			}
			return;
		}
		if (types.includes('application/goldenboard-widget') || types.includes('application/osc-node')) {
			event.preventDefault();
			dropIndicator = 'inside';
		}
	};

	const handleMoveDragStart = (event: DragEvent) => {
		if (!isEditMode || widget.id === rootId) return;
		event.stopPropagation();
		event.dataTransfer?.setData('application/goldenboard-move', JSON.stringify({ widgetId: widget.id }));
		event.dataTransfer?.setData('text/plain', widget.label);
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	};

	const handleDragLeave = (event: DragEvent) => {
		if (!isEditMode) return;
		const current = event.currentTarget as HTMLElement | null;
		const related = event.relatedTarget as Node | null;
		if (current && related && current.contains(related)) {
			return;
		}
		dropIndicator = null;
	};

	const handleDragEnd = () => {
		dropIndicator = null;
		activeGapIndex = null;
	};

	const resolvePointerPosition = (event: DragEvent, rect?: DOMRect | null): 'before' | 'after' => {
		if (!rect) return 'after';
		if (dropAxis === 'horizontal') {
			return event.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
		}
		return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
	};

	const commitMoveToGap = (widgetId: string, gapIndex: number): void => {
		if (!containerWidget) return;
		const children = containerWidget.children;
		if (!children.length) {
			moveWidget(widgetId, containerWidget.id, 'inside');
			return;
		}
		if (gapIndex <= 0) {
			moveWidget(widgetId, children[0].id, 'before');
			return;
		}
		if (gapIndex >= children.length) {
			const last = children[children.length - 1];
			moveWidget(widgetId, last.id, 'after');
			return;
		}
		const target = children[gapIndex];
		moveWidget(widgetId, target.id, 'before');
	};

	const handleGapDragOver = (event: DragEvent, gapIndex: number) => {
		if (!showGapTargets || !containerWidget) return;
		const types = Array.from(event.dataTransfer?.types ?? []);
		const isMove = types.includes('application/goldenboard-move');
		const isPalette = types.includes('application/goldenboard-widget');
		const isOsc = types.includes('application/osc-node');
		dropIndicator = null;
		if (isMove) {
			event.preventDefault();
			event.stopPropagation();
			activeGapIndex = gapIndex;
			if (event.dataTransfer) {
				event.dataTransfer.dropEffect = 'move';
			}
			return;
		}
		if (isPalette || isOsc) {
			event.preventDefault();
			event.stopPropagation();
			activeGapIndex = gapIndex;
		}
	};

	const handleGapDragLeave = (event: DragEvent) => {
		if (!showGapTargets) return;
		const current = event.currentTarget as HTMLElement | null;
		const related = event.relatedTarget as Node | null;
		if (current && related && current.contains(related)) {
			return;
		}
		activeGapIndex = null;
		dropIndicator = null;
	};

	const handleGapDrop = (event: DragEvent, gapIndex: number) => {
		if (!showGapTargets || !containerWidget) return;
		event.preventDefault();
		const movePayload = event.dataTransfer?.getData('application/goldenboard-move');
		if (movePayload) {
			const { widgetId } = JSON.parse(movePayload) as { widgetId?: string };
			if (widgetId && widgetId !== containerWidget.id) {
				commitMoveToGap(widgetId, gapIndex);
			}
			dropIndicator = null;
			activeGapIndex = null;
			event.stopPropagation();
			return;
		}
		const widgetPayload = event.dataTransfer?.getData('application/goldenboard-widget');
		if (widgetPayload) {
			const parsed = JSON.parse(widgetPayload) as Widget;
			parsed.id = createId(parsed.type);
			insertWidgetInstance(parsed, containerWidget.id);
			repositionNewWidget(parsed.id, gapIndex);
			dropIndicator = null;
			activeGapIndex = null;
			event.stopPropagation();
			return;
		}
		const oscPayload = event.dataTransfer?.getData('application/osc-node');
		if (oscPayload) {
			const osc = JSON.parse(oscPayload) as OscDropPayload;
			const newWidget = createWidgetFromOsc(osc);
			insertWidgetInstance(newWidget, containerWidget.id);
			repositionNewWidget(newWidget.id, gapIndex);
			dropIndicator = null;
			activeGapIndex = null;
			event.stopPropagation();
		}
	};

	const repositionNewWidget = (widgetId: string, gapIndex: number) => {
		if (!containerWidget) return;
		const children = containerWidget.children;
		if (!children.length) {
			return;
		}
		if (gapIndex <= 0) {
			moveWidget(widgetId, children[0].id, 'before');
			return;
		}
		if (gapIndex >= children.length) {
			const last = children[children.length - 1];
			moveWidget(widgetId, last.id, 'after');
			return;
		}
		const target = children[gapIndex];
		moveWidget(widgetId, target.id, 'before');
	};

	let selectedTab = '';
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
	data-mode={isEditMode ? 'edit' : 'live'}
	data-meta-id={metaId}
	data-meta-type={metaType}
	data-drop-position={dropIndicator ?? undefined}
	data-drop-axis={dropAxis}
	draggable={isDraggable}
	role="button"
	tabindex="0"
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
	on:dragstart={handleMoveDragStart}
	on:dragend={handleDragEnd}
	on:dragover={handleDragOver}
	on:dragleave={handleDragLeave}
	on:drop={handleDrop}
>
	{#if containerWidget}
		{#if showContainerLabel}
			<div class="widget-header">
				<h4>{metaLabel}</h4>
			</div>
		{/if}
		<div class={`container-body layout-${containerWidget.layout} ${showGapTargets ? 'has-drop-gaps' : ''}`}>
			{#if containerWidget.layout === 'tabs'}
				<div class="tabs">
					{#each containerWidget.children as child}
						<button class:selected={child.id === selectedTab} on:click={() => (selectedTab = child.id)}>{childLabel(child, ctx)}</button>
					{/each}
				</div>
				{#if selectedTab}
					{#each containerWidget.children as child}
						{#if child.id === selectedTab}
							<svelte:self widget={child} {selectedId} {rootId} parentLayout={containerWidget.layout} />
						{/if}
					{/each}
				{/if}
			{:else if containerWidget.layout === 'accordion'}
				{#each containerWidget.children as child}
					<details open>
						<summary>{childLabel(child, ctx)}</summary>
						<svelte:self widget={child} {selectedId} {rootId} parentLayout={containerWidget.layout} />
					</details>
				{/each}
			{:else}
				{#each containerWidget.children as child, index}
					<svelte:self widget={child} {selectedId} {rootId} parentLayout={containerWidget.layout} />
					{#if showGapTargets && index < containerWidget.children.length - 1}
						<div
							class={`drop-gap drop-gap-${containerDropAxis}`}
							data-active={activeGapIndex === index + 1 ? 'true' : undefined}
							role="presentation"
							on:dragover={(event) => handleGapDragOver(event, index + 1)}
							on:dragleave={handleGapDragLeave}
							on:drop={(event) => handleGapDrop(event, index + 1)}
						></div>
					{/if}
				{/each}
			{/if}
		</div>
	{:else}
		{#if widget.type === 'slider'}
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
				<span class="widget-label widget-label-stack">{metaLabel}</span>
				<ButtonWidgetView {widget} {isEditMode} value={value} label={metaLabel} onChange={handleValueInput} />
			</div>
		{:else if widget.type === 'momentary-button'}
			<div class="widget-button-block">
				<span class="widget-label widget-label-stack">{metaLabel}</span>
				<MomentaryButtonWidgetView {widget} {isEditMode} value={value} label={metaLabel} onChange={handleValueInput} />
			</div>
		{:else}
			<div class="widget-inline">
				<span class="widget-label">{metaLabel}</span>
				<div class="widget-control">
					{#if widget.type === 'int-stepper'}
						<IntStepperWidgetView {widget} {ctx} {isEditMode} value={value as number | string | null} onChange={handleValueInput} />
					{:else if widget.type === 'text-field'}
						<TextFieldWidgetView {isEditMode} value={value ?? ''} onInput={handleStringInput} />
					{:else if widget.type === 'color-picker'}
						<ColorPickerWidgetView {isEditMode} value={value ?? '#ffffff'} onInput={handleStringInput} />
					{:else if widget.type === 'rotary'}
						<RotaryWidgetView {widget} {ctx} {isEditMode} value={value as number | string | null} onChange={handleValueInput} />
					{:else if widget.type === 'toggle'}
						<ToggleWidgetView {widget} {isEditMode} value={value} label={metaLabel} onChange={handleValueInput} />
					{:else if widget.type === 'checkbox'}
						<CheckboxWidgetView {widget} {isEditMode} value={value} label={metaLabel} onChange={handleValueInput} />
					{/if}
				</div>
			</div>
		{/if}
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
		text-transform: uppercase;
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
		display: flex;
		gap: 0.5rem;
	}

	.container-body.has-drop-gaps {
		gap: 0;
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

	.drop-gap {
		position: relative;
		flex: 0 0 auto;
		opacity: 0;
		transition: opacity 120ms ease;
		border-radius: 999px;
	}

	.drop-gap::after {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--accent);
		border-radius: inherit;
		opacity: 0.15;
		transform: scale(0.4, 0.6);
		transition: opacity 120ms ease, transform 120ms ease;
	}

	.drop-gap-vertical {
		width: 100%;
		height: 0.5rem;
	}

	.drop-gap-horizontal {
		width: 0.5rem;
		height: auto;
		align-self: stretch;
	}

	.drop-gap[data-active='true'] {
		opacity: 1;
	}

	.drop-gap[data-active='true']::after {
		opacity: 0.9;
		transform: scale(1);
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
