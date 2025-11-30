

<script lang="ts">
	import SliderWidgetView from '$lib/components/widgets/SliderWidget.svelte';
	import IntStepperWidgetView from '$lib/components/widgets/IntStepperWidget.svelte';
	import TextFieldWidgetView from '$lib/components/widgets/TextFieldWidget.svelte';
	import ColorPickerWidgetView from '$lib/components/widgets/ColorPickerWidget.svelte';
	import RotaryWidgetView from '$lib/components/widgets/RotaryWidget.svelte';
	import type { ContainerWidget, SliderWidget, Widget, MetaBindingKey } from '$lib/types/widgets';
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

	let ctx: BindingContext = { oscValues: {}, widgetValues: {}, functions: {} };
	$: ctx = $bindingContext;
	let value: BindingValue = null;
	$: value = resolveBinding(widget.value, ctx) ?? null;
	let containerWidget: ContainerWidget | null = null;
	$: containerWidget = widget.type === 'container' ? (widget as ContainerWidget) : null;
	let isSelected = false;
	$: isSelected = isEditMode && widget.id === selectedId;

	let mode: EditorMode = 'edit';
	$: mode = $editorMode;
	$: isEditMode = mode === 'edit';

	let metaLabel = widget.label;
	let metaId = widget.id;
	let metaType: string = widget.type;
	let dropIndicator: 'before' | 'after' | 'inside' | null = null;
	let isDraggable = false;
	$: metaLabel = resolveMetaField('label', widget.label, ctx);
	$: metaId = resolveMetaField('id', widget.id, ctx);
	$: metaType = resolveMetaField('type', widget.type, ctx);
	$: isDraggable = isEditMode && widget.id !== rootId;

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

	const handleValueInput = (next: number | string) => {
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
				dropIndicator = event.clientY < hostRect.top + hostRect.height / 2 ? 'before' : 'after';
			}
			const { widgetId } = JSON.parse(movePayload) as { widgetId?: string };
			if (!widgetId || widgetId === widget.id) {
				dropIndicator = null;
				return;
			}
			if (containerWidget) {
				moveWidget(widgetId, widget.id, 'inside');
			} else {
				const before = hostRect ? event.clientY < hostRect.top + hostRect.height / 2 : false;
				moveWidget(widgetId, widget.id, before ? 'before' : 'after');
			}
			dropIndicator = null;
			event.stopPropagation();
			return;
		}
		if (!containerWidget) return;
		event.preventDefault();
		const widgetPayload = event.dataTransfer?.getData('application/goldenboard-widget');
		if (widgetPayload) {
			const parsed = JSON.parse(widgetPayload) as Widget;
			parsed.id = createId(parsed.type);
			insertWidgetInstance(parsed, widget.id);
			dropIndicator = null;
			event.stopPropagation();
			return;
		}
		const oscPayload = event.dataTransfer?.getData('application/osc-node');
		if (oscPayload) {
			const osc = JSON.parse(oscPayload) as { path: string; min?: number; max?: number; step?: number; name?: string };
			const slider = structuredClone(sliderTemplate);
			slider.id = createId('slider');
			slider.label = osc.name ?? osc.path;
			slider.value = oscBinding(osc.path);
			slider.props.min = literal(osc.min ?? 0);
			slider.props.max = literal(osc.max ?? 1);
			slider.props.step = literal(osc.step ?? 0.01);
			insertWidgetInstance(slider, widget.id);
			dropIndicator = null;
			event.stopPropagation();
		}
	};

	const handleDragOver = (event: DragEvent) => {
		if (!isEditMode) return;
		const types = Array.from(event.dataTransfer?.types ?? []);
		if (types.includes('application/goldenboard-move')) {
			event.preventDefault();
			event.dataTransfer && (event.dataTransfer.dropEffect = 'move');
			if (containerWidget) {
				dropIndicator = 'inside';
			} else {
				const rect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect();
				if (rect) {
					dropIndicator = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
				}
			}
			return;
		}
		if (!containerWidget) return;
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

</script>

<div
	class={`widget ${isSelected ? 'selected' : ''}`}
	data-mode={isEditMode ? 'edit' : 'live'}
	data-meta-id={metaId}
	data-meta-type={metaType}
	data-drop-position={dropIndicator ?? undefined}
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
	{#if isEditMode && widget.id !== rootId}
		<button
			type="button"
			class="widget-drag-handle"
			title="Drag to move"
			tabindex="-1"
			aria-hidden="true"
			on:click|stopPropagation
			on:mousedown|stopPropagation
			on:dragstart={handleMoveDragStart}
		>
			⋮⋮
		</button>
	{/if}
	{#if containerWidget}
		<div class="widget-header">
			<h4>{metaLabel}</h4>
		</div>
		<div class={`container-body layout-${containerWidget.layout}`}>
			{#if containerWidget.layout === 'tabs'}
				<div class="tabs">
					{#each containerWidget.children as child}
						<button class:selected={child.id === selectedTab} on:click={() => (selectedTab = child.id)}>{childLabel(child, ctx)}</button>
					{/each}
				</div>
				{#if selectedTab}
					{#each containerWidget.children as child}
						{#if child.id === selectedTab}
							<svelte:self widget={child} {selectedId} {rootId} />
						{/if}
					{/each}
				{/if}
			{:else if containerWidget.layout === 'accordion'}
				{#each containerWidget.children as child}
					<details open>
						<summary>{childLabel(child, ctx)}</summary>
						<svelte:self widget={child} {selectedId} {rootId} />
					</details>
				{/each}
			{:else}
				{#each containerWidget.children as child}
					<svelte:self widget={child} {selectedId} {rootId} />
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

	:global(.widget[data-mode='edit'] input:disabled),
	:global(.widget[data-mode='edit'] .rotary input:disabled) {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.container-body {
		display: flex;
		gap: 0.5rem;
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

	.tabs {
		display: flex;
		gap: 0.35rem;
		margin-bottom: 0.5rem;
	}

	.tabs button.selected {
		background: var(--accent);
		color: #0b0902;
	}

	.widget-drag-handle {
		position: absolute;
		top: 6px;
		right: 6px;
		width: 24px;
		height: 24px;
		border: none;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.08);
		color: var(--muted);
		font-size: 0.75rem;
		cursor: grab;
		opacity: 0;
		transition: opacity 120ms ease, background 120ms ease;
	}

	.widget[data-mode='edit']:hover .widget-drag-handle,
	.widget[data-mode='edit'].selected .widget-drag-handle {
		opacity: 1;
	}

	.widget-drag-handle:active {
		cursor: grabbing;
		background: rgba(255, 255, 255, 0.15);
	}


</style>
