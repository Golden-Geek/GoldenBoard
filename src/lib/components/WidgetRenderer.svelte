

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
	$: isSelected = widget.id === selectedId;

	let mode: EditorMode = 'edit';
	$: mode = $editorMode;
	$: isEditMode = mode === 'edit';

	let metaLabel = widget.label;
	let metaId = widget.id;
	let metaType: string = widget.type;
	$: metaLabel = resolveMetaField('label', widget.label, ctx);
	$: metaId = resolveMetaField('id', widget.id, ctx);
	$: metaType = resolveMetaField('type', widget.type, ctx);

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
		if (!containerWidget) return;
		event.preventDefault();
		const widgetPayload = event.dataTransfer?.getData('application/goldenboard-widget');
		if (widgetPayload) {
			const parsed = JSON.parse(widgetPayload) as Widget;
			parsed.id = createId(parsed.type);
			insertWidgetInstance(parsed, widget.id);
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
		}
	};

	const handleDragOver = (event: DragEvent) => {
		if (!containerWidget) return;
		event.preventDefault();
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
	on:dragover={handleDragOver}
	on:drop={handleDrop}
>
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
		<div class="widget-inline">
			<span class="widget-label">{metaLabel}</span>
			<div class="widget-control">
				{#if widget.type === 'slider'}
					<SliderWidgetView {widget} {ctx} {isEditMode} value={value as number | string | null} onChange={handleValueInput} />
				{:else if widget.type === 'int-stepper'}
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
		flex-wrap: wrap;
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


</style>
