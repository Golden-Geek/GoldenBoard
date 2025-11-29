
<script lang="ts">
	import {
		activeBoard,
		selectedWidget,
		updateBoardCss,
		updateWidgetBindings,
		renameWidgetId
	} from '$lib/stores/boards';
	import type { ContainerWidget } from '$lib/types/widgets';
	import {
		expressionBinding,
		literal,
		oscBinding,
		type Binding,
		widgetBinding
	} from '$lib/types/binding';

	let widgetCss = '';
	let boardCss = '';
	let bindingKind: Binding['kind'] = 'literal';
	let bindingValue = '';
	let widgetProps: Array<[string, Binding]> = [];
	const layouts: ContainerWidget['layout'][] = ['horizontal', 'vertical', 'fixed-grid', 'smart-grid', 'free', 'tabs', 'accordion'];

	$: if ($selectedWidget) {
		widgetCss = $selectedWidget.widget.css ?? '';
		bindingKind = $selectedWidget.widget.value.kind;
		bindingValue = extractBindingValue($selectedWidget.widget.value);
	}

	$: boardCss = $activeBoard?.css ?? '';
	$: widgetProps = $selectedWidget ? Object.entries(($selectedWidget.widget.props as Record<string, Binding>) ?? {}) : [];

	const extractBindingValue = (binding: Binding) => {
		switch (binding.kind) {
			case 'literal':
				return String(binding.value ?? '');
			case 'osc':
				return binding.path;
			case 'widget':
				return binding.target;
			case 'expression':
				return binding.code;
		}
	};

	const updateBinding = () => {
		if (!$selectedWidget) return;
		const next = createBinding(bindingKind, bindingValue);
		updateWidgetBindings($selectedWidget.widget.id, (current) => ({ ...current, value: next }));
	};

	const createBinding = (kind: Binding['kind'], value: string): Binding => {
		switch (kind) {
			case 'literal':
				return literal(parseValue(value));
			case 'osc':
				return oscBinding(value);
			case 'widget':
				return widgetBinding(value);
			case 'expression':
				return expressionBinding(value);
		}
	};

	const parseValue = (value: string) => {
		const numeric = Number(value);
		if (!Number.isNaN(numeric) && value.trim() !== '') {
			return numeric;
		}
		return value;
	};

	const updateLabel = (event: Event) => {
		const next = (event.target as HTMLInputElement).value;
		if (!$selectedWidget) return;
		updateWidgetBindings($selectedWidget.widget.id, (widget) => ({ ...widget, label: next }));
	};

	const updateId = (event: Event) => {
		const next = (event.target as HTMLInputElement).value;
		if (!$selectedWidget) return;
		renameWidgetId($selectedWidget.widget.id, next);
	};

	const updateCss = (event: Event) => {
		const next = (event.target as HTMLTextAreaElement).value;
		if (!$selectedWidget) return;
		updateWidgetBindings($selectedWidget.widget.id, (widget) => ({ ...widget, css: next }));
	};

	const updateBoardTheme = (event: Event) => {
		boardCss = (event.target as HTMLTextAreaElement).value;
		updateBoardCss(boardCss);
	};

	const updateProp = (key: string, value: string) => {
		if (!$selectedWidget) return;
		updateWidgetBindings($selectedWidget.widget.id, (widget) => {
			const props = { ...(widget.props as Record<string, Binding>) };
			props[key] = literal(parseValue(value));
			return { ...widget, props } as typeof widget;
		});
	};

	const updateLayout = (event: Event) => {
		if (!$selectedWidget || $selectedWidget.widget.type !== 'container') return;
		const layout = (event.target as HTMLSelectElement).value as ContainerWidget['layout'];
		updateWidgetBindings($selectedWidget.widget.id, (widget) => ({ ...widget, layout }));
	};
</script>

<div class="panel inspector-panel">
	<div class="inspector-header">
		<div>
			<p class="section-label">Inspector</p>
			{#if $selectedWidget}
				<div class="inspector-title">
					<strong>{$selectedWidget.widget.label}</strong>
					<span>#{ $selectedWidget.widget.id }</span>
				</div>
			{/if}
		</div>
		{#if $selectedWidget}
			<span class="type-pill">{$selectedWidget.widget.type}</span>
		{/if}
	</div>

	{#if $selectedWidget}
		<form class="property-list" on:submit|preventDefault>
			<div class="property-row">
				<span class="property-label">ID</span>
				<input type="text" value={$selectedWidget.widget.id} on:change={updateId} />
			</div>

			<div class="property-row">
				<span class="property-label">Label</span>
				<input type="text" value={$selectedWidget.widget.label} on:input={updateLabel} />
			</div>

			<div class="property-row">
				<span class="property-label">Type</span>
				<input type="text" value={$selectedWidget.widget.type} disabled />
			</div>

			{#if $selectedWidget.widget.type === 'container'}
				<div class="property-row">
					<span class="property-label">Layout</span>
					<select value={$selectedWidget.widget.layout} on:change={updateLayout}>
						{#each layouts as layout}
							<option value={layout}>{layout}</option>
						{/each}
					</select>
				</div>
			{/if}

			<div class="property-row binding-row">
				<span class="property-label">Binding</span>
				<div class="binding-fields">
					<select bind:value={bindingKind} on:change={updateBinding}>
						<option value="literal">Literal</option>
						<option value="osc">OSC Path</option>
						<option value="widget">Widget Property</option>
						<option value="expression">Expression</option>
					</select>
					<input type="text" bind:value={bindingValue} on:change={updateBinding} />
				</div>
			</div>

			<p class="property-heading">Widget Props</p>
			{#if widgetProps.length}
				{#each widgetProps as [key, binding]}
					<div class="property-row">
						<span class="property-label">{key}</span>
						<input
							type="text"
							value={binding.kind === 'literal' ? String(binding.value ?? '') : ''}
							on:change={(event) => updateProp(key, (event.target as HTMLInputElement).value)}
						/>
					</div>
				{/each}
			{:else}
				<p class="property-note muted">No widget props.</p>
			{/if}

			<div class="property-row stacked">
				<span class="property-label">Widget CSS</span>
				<textarea rows={4} bind:value={widgetCss} on:change={updateCss} placeholder={'.selector { }'}></textarea>
			</div>
		</form>

		<details class="inspector-section" open>
			<summary>Definition</summary>
			<pre class="json-preview">{JSON.stringify($selectedWidget.widget, null, 2)}</pre>
		</details>
	{:else}
		<p class="muted empty-state">Select a widget to edit its properties.</p>
	{/if}

	<details class="inspector-section" open>
		<summary>Board CSS</summary>
		<textarea rows={4} bind:value={boardCss} on:change={updateBoardTheme} placeholder={'body { }'}></textarea>
	</details>
</div>

<style>
	.inspector-panel {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.inspector-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.section-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--muted);
		margin: 0 0 0.2rem;
	}

	.inspector-title {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.inspector-title strong {
		font-size: 0.95rem;
	}

	.inspector-title span {
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		color: var(--muted);
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.05);
	}

	.type-pill {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.property-list {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.property-row {
		display: grid;
		grid-template-columns: 120px minmax(0, 1fr);
		gap: 0.5rem;
		align-items: center;
		padding: 0.35rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
	}

	.property-row:last-child {
		border-bottom: none;
	}

	.property-row.stacked {
		align-items: flex-start;
	}

	.property-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted);
	}

	.binding-fields {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.property-row input,
	.property-row select,
	.property-row textarea {
		width: 100%;
	}

	.binding-fields select {
		min-width: 140px;
	}

	.property-heading {
		margin: 0.4rem 0 0.1rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--muted);
	}

	.property-row textarea {
		grid-column: 2 / 3;
		width: 100%;
		min-height: 110px;
		resize: vertical;
	}

	.property-note {
		margin-left: 120px;
		font-size: 0.72rem;
	}

	.inspector-section {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 6px;
		padding: 0.35rem 0.6rem 0.6rem;
	}

	.inspector-section summary {
		cursor: pointer;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--muted);
		margin-bottom: 0.4rem;
	}

	.inspector-section textarea {
		width: 100%;
		min-height: 120px;
		resize: vertical;
	}

	.empty-state {
		padding: 1rem 0;
		text-align: center;
	}
</style>
