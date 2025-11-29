<script lang="ts">
	import {
		activeBoard,
		addWidgetToBoard,
		instantiateCustomWidget,
		registerCustomWidget,
		removeCustomWidgetTemplate
	} from '$lib/stores/boards';
	import type { WidgetKind, WidgetTemplate } from '$lib/types/widgets';

	export let iconOnly = false;

	const widgetOptions: { type: WidgetKind; label: string; icon: string }[] = [
		{ type: 'container', label: 'Container', icon: '▣' },
		{ type: 'slider', label: 'Slider', icon: '⎯' },
		{ type: 'int-stepper', label: 'Stepper', icon: '±' },
		{ type: 'text-field', label: 'Text', icon: '𝚊' },
		{ type: 'color-picker', label: 'Color', icon: '◎' },
		{ type: 'rotary', label: 'Rotary', icon: '⟳' }
	];

	let customInput: HTMLInputElement;

	const handleCustomUpload = () => customInput.click();

	const parseTemplate = async (event: Event) => {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const text = await file.text();
		try {
			const parsed = JSON.parse(text) as Partial<WidgetTemplate>;
			if (!parsed.payload || !parsed.type) {
				throw new Error('Invalid template');
			}
			registerCustomWidget({
				id: parsed.id ?? crypto.randomUUID?.() ?? `custom-${Date.now()}`,
				name: parsed.name ?? 'Custom Widget',
				type: parsed.type,
				payload: parsed.payload,
				summary: parsed.summary ?? parsed.type
			});
		} catch (error) {
			alert('Invalid widget template');
		}
		(event.target as HTMLInputElement).value = '';
	};
</script>

<div class={`widget-toolbar ${iconOnly ? 'icon-only' : ''}`} role="toolbar" aria-label="Widget palette">
	<div class="widget-buttons">
		{#each widgetOptions as option}
			<button
				type="button"
				title={option.label}
				aria-label={option.label}
				on:click={() => addWidgetToBoard(option.type)}
			>
				<span class="icon">{option.icon}</span>
				{#if !iconOnly}
					<span class="label">{option.label}</span>
				{/if}
			</button>
		{/each}
	</div>
	<div class="custom widgets">
		<button
			class={`ghost ${iconOnly ? 'ghost-icon' : ''}`}
			type="button"
			title="Load custom widget"
			aria-label="Load custom widget"
			on:click={handleCustomUpload}
		>
			{#if iconOnly}
				+
			{:else}
				Load Custom
			{/if}
		</button>
		<input bind:this={customInput} type="file" accept="application/json" hidden on:change={parseTemplate} />
		{#if $activeBoard?.customWidgets.length}
			<div class="custom-list" aria-label="Custom widgets">
				{#each $activeBoard.customWidgets as widget}
					<div class="chip">
						<button type="button" title={`Insert ${widget.name}`} on:click={() => instantiateCustomWidget(widget.id)}>
							{widget.name}
						</button>
						<button
							type="button"
							aria-label={`Remove ${widget.name}`}
							on:click={() => removeCustomWidgetTemplate(widget.id)}
						>
							✕
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.widget-toolbar {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		flex: 1;
	}

	.widget-buttons {
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	.widget-buttons button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.2rem;
		padding: 0.3rem;
		width: 32px;
		height: 32px;
		background: rgba(255, 255, 255, 0.04);
		border-radius: 6px;
	}

	.icon {
		font-size: 0.9rem;
	}

	.widget-toolbar.icon-only .label {
		display: none;
	}

	.custom-list {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.ghost-icon {
		width: 32px;
		height: 32px;
		padding: 0;
		font-size: 1rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 999px;
		padding-left: 0.4rem;
	}

	.chip button {
		background: transparent;
		border: none;
		color: inherit;
		padding: 0.25rem 0.5rem;
		font-size: 0.8rem;
	}

	.chip button:last-child {
		color: var(--muted);
	}
</style>
