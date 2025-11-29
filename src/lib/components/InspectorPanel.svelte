

<script lang="ts">
	import {
		activeBoard,
		selectedWidget,
		updateBoardCss,
		updateWidgetBindings,
		renameWidgetId
	} from '$lib/stores/boards';
	import { mainSettings, updateMainSettings } from '$lib/stores/ui';
	import type { ContainerWidget, Widget } from '$lib/types/widgets';
	import {
			expressionBinding,
			isExpressionValid,
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
	let labelBindingKind: Binding['kind'] = 'literal';
	let labelBindingValue = '';
	let valueBindingError = '';
	let labelBindingError = '';
	let inspectorView: 'widget' | 'board' | 'settings' = 'widget';
	let globalCssInput = '';

	const layouts: ContainerWidget['layout'][] = ['horizontal', 'vertical', 'fixed-grid', 'smart-grid', 'free', 'tabs', 'accordion'];
	const bindingOrder: Binding['kind'][] = ['literal', 'osc', 'widget', 'expression'];
	const bindingVisuals: Record<Binding['kind'], { icon: string; label: string; tone: string }> = {
		literal: { icon: '𝟙', label: 'Literal value', tone: 'literal' },
		osc: { icon: 'OSC', label: 'OSC path', tone: 'osc' },
		widget: { icon: '⇄', label: 'Widget link', tone: 'widget' },
		expression: { icon: 'ƒx', label: 'Expression', tone: 'expression' }
	};

	$: if ($selectedWidget) {
		widgetCss = $selectedWidget.widget.css ?? '';
		bindingKind = $selectedWidget.widget.value.kind;
		bindingValue = extractBindingValue($selectedWidget.widget.value);
		const labelBinding = getLabelBinding($selectedWidget.widget);
		labelBindingKind = labelBinding.kind;
		labelBindingValue = extractBindingValue(labelBinding);
		valueBindingError = '';
		labelBindingError = '';
	}

	$: boardCss = $activeBoard?.css ?? '';
	$: globalCssInput = $mainSettings.globalCss;
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
		if (bindingKind === 'expression' && !isExpressionValid(bindingValue)) {
			valueBindingError = 'Invalid expression syntax';
			return;
		}
		const next = createBinding(bindingKind, bindingValue);
		valueBindingError = '';
		updateWidgetBindings($selectedWidget.widget.id, (current) => ({ ...current, value: next }));
	};

	const cycleBindingKind = () => {
		bindingKind = nextBinding(bindingKind);
		valueBindingError = '';
		updateBinding();
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

	const nextBinding = (kind: Binding['kind']): Binding['kind'] => {
		const index = bindingOrder.indexOf(kind);
		return bindingOrder[(index + 1) % bindingOrder.length];
	};

	const getLabelBinding = (widget: Widget): Binding => widget.meta?.label ?? literal(widget.label);

	const createStringBinding = (kind: Binding['kind'], value: string): Binding => {
		switch (kind) {
			case 'literal':
				return literal(value);
			default:
				return createBinding(kind, value);
		}
	};

	const commitLabelBinding = () => {
		if (!$selectedWidget) return;
		if (labelBindingKind === 'expression' && !isExpressionValid(labelBindingValue)) {
			labelBindingError = 'Invalid expression syntax';
			return;
		}
		const binding = createStringBinding(labelBindingKind, labelBindingValue);
		labelBindingError = '';
		updateWidgetBindings($selectedWidget.widget.id, (widget) => {
			const meta = { ...(widget.meta ?? {}) };
			meta.label = binding;
			const next = { ...widget, meta };
			if (binding.kind === 'literal') {
				return { ...next, label: String(binding.value ?? '') };
			}
			return next;
		});
	};

	const cycleLabelBinding = () => {
		labelBindingKind = nextBinding(labelBindingKind);
		labelBindingError = '';
		commitLabelBinding();
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

	const toggleLiveBoardsSetting = (event: Event) => {
		const checked = (event.target as HTMLInputElement).checked;
		updateMainSettings({ showLiveBoards: checked });
	};

	const updateGlobalCssSetting = () => {
		updateMainSettings({ globalCss: globalCssInput });
	};
</script>


<div class="panel inspector-panel">
	<div class="inspector-header">
		<div>
			<p class="section-label">Inspector</p>
			<div class="inspector-tabs" role="tablist" aria-label="Inspector views">
				<button type="button" class:selected={inspectorView === 'widget'} on:click={() => (inspectorView = 'widget')}>
					Widget
				</button>
				<button type="button" class:selected={inspectorView === 'board'} on:click={() => (inspectorView = 'board')}>
					Board
				</button>
				<button type="button" class:selected={inspectorView === 'settings'} on:click={() => (inspectorView = 'settings')}>
					Main Settings
				</button>
			</div>
			{#if inspectorView === 'widget' && $selectedWidget}
				<div class="inspector-title">
					<strong>{$selectedWidget.widget.label}</strong>
					<span>#{ $selectedWidget.widget.id }</span>
				</div>
			{:else if inspectorView === 'board' && $activeBoard}
				<div class="inspector-title">
					<strong>{$activeBoard.name}</strong>
					<span>Board</span>
				</div>
			{:else if inspectorView === 'settings'}
				<div class="inspector-title">
					<strong>Main Settings</strong>
					<span>Workspace</span>
				</div>
			{/if}
		</div>
		{#if inspectorView === 'widget' && $selectedWidget}
			<span class="type-pill">{$selectedWidget.widget.type}</span>
		{:else if inspectorView === 'board'}
			<span class="type-pill">Board</span>
		{:else if inspectorView === 'settings'}
			<span class="type-pill">Global</span>
		{/if}
	</div>

	{#if inspectorView === 'widget'}
		{#if $selectedWidget}
		<form class="property-list" on:submit|preventDefault>
			<div class="property-row">
				<span class="property-label">ID</span>
				<input type="text" value={$selectedWidget.widget.id} on:change={updateId} />
			</div>

			<div class="property-row binding-row">
				<span class="property-label">Label</span>
				<div class="binding-inline">
					<button
						type="button"
						title={`Label binding: ${bindingVisuals[labelBindingKind].label}`}
						class={`binding-toggle ${bindingVisuals[labelBindingKind].tone}`}
						on:click={cycleLabelBinding}
					>
						{bindingVisuals[labelBindingKind].icon}
					</button>
					<input
						type="text"
						bind:value={labelBindingValue}
						placeholder="Widget label"
						on:change={commitLabelBinding}
					/>
				</div>
				{#if labelBindingError}
					<span class="binding-error" role="status" aria-live="polite">{labelBindingError}</span>
				{/if}
			</div>

			<!-- <div class="property-row">
				<span class="property-label">Type</span>
				<input type="text" value={$selectedWidget.widget.type} disabled />
			</div> -->

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
				<span class="property-label">Value</span>
				<div class="binding-inline">
					<button
						type="button"
						title={`Value : ${bindingVisuals[bindingKind].label}`}
						class={`binding-toggle ${bindingVisuals[bindingKind].tone}`}
						on:click={cycleBindingKind}
					>
						{bindingVisuals[bindingKind].icon}
					</button>
					<input type="text" bind:value={bindingValue} placeholder="Enter binding" on:change={updateBinding} />
				</div>
				{#if valueBindingError}
					<span class="binding-error" role="status" aria-live="polite">{valueBindingError}</span>
				{/if}
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
	{:else if inspectorView === 'board'}
		{#if $activeBoard}
			<div class="property-list" aria-live="polite">
				<div class="property-row">
					<span class="property-label">Board Name</span>
					<input type="text" value={$activeBoard.name} disabled />
				</div>
				<div class="property-row">
					<span class="property-label">Board ID</span>
					<input type="text" value={$activeBoard.id} disabled />
				</div>
				<div class="property-row stacked">
					<span class="property-label">Board CSS</span>
					<textarea rows={6} bind:value={boardCss} on:change={updateBoardTheme} placeholder={'body { }'}></textarea>
				</div>
			</div>
		{:else}
			<p class="muted empty-state">No board selected.</p>
		{/if}
	{:else}
		<div class="property-list" aria-live="polite">
			<div class="property-row">
				<span class="property-label">Show Boards List</span>
				<label class="toggle" aria-label="Show boards list in live mode">
					<input type="checkbox" checked={$mainSettings.showLiveBoards} on:change={toggleLiveBoardsSetting} />
				</label>
			</div>
			<div class="property-row stacked">
				<span class="property-label">Global CSS</span>
				<textarea rows={6} bind:value={globalCssInput} on:input={updateGlobalCssSetting} placeholder={':root { }'}></textarea>
			</div>
		</div>
	{/if}
</div>

<style>
	.inspector-panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		overflow-x: hidden;
		padding: 0.5rem;
	}

	.inspector-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.inspector-tabs {
		display: flex;
		gap: 0.25rem;
		margin: 0.2rem 0 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		padding-bottom: 0.25rem;
	}

	.inspector-tabs button {
		flex: none;
		background: transparent;
		border: none;
		border-radius: 0;
		font-size: 0.62rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		padding: 0.1rem 0.35rem;
		color: var(--muted);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: color 120ms ease, border 120ms ease;
	}

	.inspector-tabs button.selected {
		color: var(--text);
		border-color: var(--accent);
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
		gap: 0.05rem;
		font-size: 0.85rem;
	}

	.property-row {
		display: grid;
		grid-template-columns: 110px minmax(0, 1fr);
		gap: 0.4rem;
		align-items: center;
		padding: 0.25rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
	}

	.property-row:last-child {
		border-bottom: none;
	}

	.property-row.stacked,
	.property-row.binding-row {
		align-items: flex-start;
	}

	.property-label {
		font-size: 0.64rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--muted);
	}

	.binding-inline {
		display: flex;
		gap: 0.35rem;
		align-items: center;
	}

	.binding-error {
		grid-column: 2;
		font-size: 0.7rem;
		color: var(--danger);
		margin-top: 0.2rem;
	}

	.binding-inline input {
		flex: 1;
		min-width: 0;
	}

	.binding-toggle {
		border-radius: 6px;
		width: 30px;
		height: 30px;
		padding: 0;
		font-size: 0.72rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.06);
		cursor: pointer;
		transition: background 120ms ease, border 120ms ease, transform 120ms ease;
	}

	.binding-toggle.literal {
		background: var(--accent);
		color: #0b0600;
		border-color: transparent;
	}

	.binding-toggle.osc {
		background: rgba(87, 167, 255, 0.2);
		color: #7ec8ff;
		border-color: rgba(87, 167, 255, 0.4);
	}

	.binding-toggle.widget {
		background: rgba(95, 255, 196, 0.18);
		color: #6ef7c6;
		border-color: rgba(95, 255, 196, 0.5);
	}

	.binding-toggle.expression {
		background: rgba(205, 146, 255, 0.18);
		color: #d6a8ff;
		border-color: rgba(205, 146, 255, 0.45);
	}

	.property-row input,
	.property-row select,
	.property-row textarea {
		width: 100%;
		font-size: 0.85rem;
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
		margin-left: 110px;
		font-size: 0.68rem;
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


	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.toggle input[type='checkbox'] {
		width: 38px;
		height: 20px;
		accent-color: var(--accent);
	}

	.json-preview {
		white-space: pre-wrap;
		word-break: break-word;
	}

	.empty-state {
		padding: 1rem 0;
		text-align: center;
	}
</style>
