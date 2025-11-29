<script lang="ts">
	import { addWidgetToBoard, activeBoard, createWidget, registerCustomWidget } from '$lib/stores/boards';
	import type { WidgetKind, WidgetTemplate } from '$lib/types/widgets';

	const widgetOptions: { label: string; type: WidgetKind; hint: string }[] = [
		{ label: 'Container', type: 'container', hint: 'Nested layouts' },
		{ label: 'Slider', type: 'slider', hint: 'Continuous control' },
		{ label: 'Int Stepper', type: 'int-stepper', hint: 'Whole numbers' },
		{ label: 'Text Field', type: 'text-field', hint: 'Strings / decimals' },
		{ label: 'Color', type: 'color-picker', hint: 'Pick a color' },
		{ label: 'Rotary', type: 'rotary', hint: 'Knob control' }
	];

	let customInput: HTMLInputElement;

	const handleAdd = (type: WidgetKind) => {
		addWidgetToBoard(type);
	};

	const handleCustomUpload = () => customInput.click();

	const parseTemplate = async (event: Event) => {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const text = await file.text();
		try {
			const parsed = JSON.parse(text) as Partial<WidgetTemplate>;
			if (!parsed.payload || !parsed.type) {
				throw new Error('Missing widget payload or type');
			}
			registerCustomWidget({
				id: parsed.id ?? crypto.randomUUID?.() ?? `custom-${Date.now()}`,
				name: parsed.name ?? 'Custom Widget',
				type: parsed.type,
				payload: parsed.payload,
				summary: parsed.summary
			});
		} catch (error) {
			alert('Invalid widget template');
		}
		(event.target as HTMLInputElement).value = '';
	};

	const handleDragStart = (event: DragEvent, type: WidgetKind) => {
		const data = createWidget(type);
		event.dataTransfer?.setData('application/goldenboard-widget', JSON.stringify(data));
	};
</script>

<div class="panel widget-palette">
	<div class="section-title">Widgets</div>
	<div class="palette-grid">
		{#each widgetOptions as option}
			<button
				draggable
				on:dragstart={(event) => handleDragStart(event, option.type)}
				on:click={() => handleAdd(option.type)}
			>
				<strong>{option.label}</strong>
				<small>{option.hint}</small>
			</button>
		{/each}
	</div>
	<div class="section-title">Custom Widgets</div>
	{#if $activeBoard?.customWidgets.length}
		<div class="custom-list">
			{#each $activeBoard.customWidgets as widget}
				<div
					class="custom-row"
					draggable
					role="button"
					tabindex="0"
					on:dragstart={(event) =>
						event.dataTransfer?.setData('application/goldenboard-widget', JSON.stringify(widget.payload))}
				>
					<span>{widget.name}</span>
					<small>{widget.summary ?? widget.type}</small>
				</div>
			{/each}
		</div>
	{:else}
		<p class="muted">No custom widgets yet.</p>
	{/if}
	<button class="ghost" on:click={handleCustomUpload}>Load Custom Widget</button>
	<input type="file" accept="application/json" hidden bind:this={customInput} on:change={parseTemplate} />
</div>

<style>
	.palette-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.4rem;
	}

	.palette-grid button {
		justify-content: flex-start;
		align-items: flex-start;
		flex-direction: column;
	}

	.custom-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.custom-row {
		padding: 0.35rem 0.45rem;
		border: 1px dashed rgba(255, 255, 255, 0.08);
		border-radius: 8px;
	}

	.muted {
		color: var(--muted);
		font-size: 0.85rem;
	}
</style>
