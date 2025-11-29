<script lang="ts">
	import type { ContainerWidget, SliderWidget, Widget } from '$lib/types/widgets';
	import { literal, oscBinding, resolveBinding, type Binding, type BindingContext, type BindingValue } from '$lib/types/binding';
	import { bindingContext } from '$lib/stores/runtime';
	import {
		insertWidgetInstance,
		propagateWidgetValue,
		selectWidget,
		setWidgetLiteralValue,
		updateWidgetBindings
	} from '$lib/stores/boards';
	import { createId } from '$lib/utils/ids';

	export let widget: Widget;
	export let selectedId: string | undefined;

	let ctx: BindingContext = { oscValues: {}, widgetValues: {}, functions: {} };
	$: ctx = $bindingContext;
	let value: BindingValue = null;
	$: value = resolveBinding(widget.value, ctx) ?? null;
	let containerWidget: ContainerWidget | null = null;
	$: containerWidget = widget.type === 'container' ? (widget as ContainerWidget) : null;
	let isSelected = false;
	$: isSelected = widget.id === selectedId;

	const resolveProp = (key: string, fallback = 0): number => {
		const props = widget.props as Record<string, Binding> | undefined;
		const binding = props?.[key];
		const resolved = binding ? resolveBinding(binding, ctx) : undefined;
		return typeof resolved === 'number' ? resolved : fallback;
	};

	const handleValueInput = (next: number | string) => {
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

	const handleLayoutChange = (layout: ContainerWidget['layout']) => {
		updateWidgetBindings(widget.id, (current) => {
			if (current.type !== 'container') return current;
			return { ...current, layout } as Widget;
		});
	};
</script>

<div
	class={`widget ${isSelected ? 'selected' : ''}`}
	role="button"
	tabindex="0"
	on:click={(event) => {
		event.stopPropagation();
		selectWidget(widget.id);
	}}
	on:keydown={(event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectWidget(widget.id);
		}
	}}
	on:dragover={handleDragOver}
	on:drop={handleDrop}
>
	<header>
		<h4>{widget.label}</h4>
		{#if containerWidget}
			<select value={containerWidget.layout} on:change={(event) => handleLayoutChange((event.target as HTMLSelectElement).value as ContainerWidget['layout'])}>
				<option value="horizontal">Horizontal</option>
				<option value="vertical">Vertical</option>
				<option value="fixed-grid">Fixed Grid</option>
				<option value="smart-grid">Smart Grid</option>
				<option value="free">Free</option>
				<option value="tabs">Tabs</option>
				<option value="accordion">Accordion</option>
			</select>
		{/if}
	</header>

	{#if widget.type === 'slider'}
		<div class="control">
			<input
				type="range"
				min={resolveProp('min', 0)}
				max={resolveProp('max', 1)}
				step={resolveProp('step', 0.01)}
				value={Number(value) ?? 0}
				on:input={(event) => handleValueInput(parseFloat((event.target as HTMLInputElement).value))}
			/>
			<input
				type="number"
				value={Number(value) ?? 0}
				on:change={(event) => handleValueInput(parseFloat((event.target as HTMLInputElement).value))}
			/>
		</div>
	{:else if widget.type === 'int-stepper'}
		<div class="control">
			<input
				type="number"
				step={resolveProp('step', 1)}
				value={Number(value) ?? 0}
				on:change={(event) => handleValueInput(parseInt((event.target as HTMLInputElement).value, 10))}
			/>
		</div>
	{:else if widget.type === 'text-field'}
		<div class="control">
			<input type="text" value={value ?? ''} on:input={(event) => handleStringInput((event.target as HTMLInputElement).value)} />
		</div>
	{:else if widget.type === 'color-picker'}
		<div class="control">
			<input type="color" value={(value as string) ?? '#ffffff'} on:input={(event) => handleStringInput((event.target as HTMLInputElement).value)} />
		</div>
	{:else if widget.type === 'rotary'}
		<div class="rotary">
			<input
				type="range"
				min={resolveProp('min', 0)}
				max={resolveProp('max', 1)}
				step={resolveProp('step', 0.01)}
				value={Number(value) ?? 0}
				on:input={(event) => handleValueInput(parseFloat((event.target as HTMLInputElement).value))}
			/>
			<span>{Number(value).toFixed(2)}</span>
		</div>
	{:else if containerWidget}
		<div class={`container-body layout-${containerWidget.layout}`}>
			{#if containerWidget.layout === 'tabs'}
				<div class="tabs">
					{#each containerWidget.children as child}
						<button class:selected={child.id === selectedTab} on:click={() => (selectedTab = child.id)}>{child.label}</button>
					{/each}
				</div>
				{#if selectedTab}
					{#each containerWidget.children as child}
						{#if child.id === selectedTab}
							<svelte:self widget={child} {selectedId} />
						{/if}
					{/each}
				{/if}
			{:else if containerWidget.layout === 'accordion'}
				{#each containerWidget.children as child}
					<details open>
						<summary>{child.label}</summary>
						<svelte:self widget={child} {selectedId} />
					</details>
				{/each}
			{:else}
				{#each containerWidget.children as child}
					<svelte:self widget={child} {selectedId} />
				{/each}
			{/if}
		</div>
	{/if}
</div>

<style>
	.widget header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.control {
		display: flex;
		gap: 0.4rem;
		align-items: center;
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

	.rotary {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
</style>
