<script lang="ts">
	import { activeBoard, selectedWidget, updateBoardCss, updateWidgetBindings } from '$lib/stores/boards';
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

	$: if ($selectedWidget) {
		widgetCss = $selectedWidget.widget.css ?? '';
		bindingKind = $selectedWidget.widget.value.kind;
		bindingValue = extractBindingValue($selectedWidget.widget.value);
	}

	$: boardCss = $activeBoard?.css ?? '';

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
</script>

<div class="panel inspector-panel">
	<div class="section-title">Inspector</div>
	{#if $selectedWidget}
		<form class="inspector-form" on:submit|preventDefault>
			<label>
				<span>Label</span>
				<input type="text" value={$selectedWidget.widget.label} on:input={updateLabel} />
			</label>

			<label>
				<span>Binding</span>
				<select bind:value={bindingKind} on:change={updateBinding}>
					<option value="literal">Literal</option>
					<option value="osc">OSC Path</option>
					<option value="widget">Widget Property</option>
					<option value="expression">Expression</option>
				</select>
				<input type="text" bind:value={bindingValue} on:change={updateBinding} />
			</label>

			{#if Object.keys($selectedWidget.widget.props).length}
				<div>
					<span class="section-title">Properties</span>
					{#each Object.entries($selectedWidget.widget.props) as [key, binding]}
						<label>
							<span>{key}</span>
							<input type="text" value={binding.kind === 'literal' ? String(binding.value ?? '') : ''} on:change={(event) => updateProp(key, (event.target as HTMLInputElement).value)} />
						</label>
					{/each}
				</div>
			{/if}

			<label>
				<span>Widget CSS</span>
				<textarea rows={4} bind:value={widgetCss} on:change={updateCss} placeholder={'.selector { }'}></textarea>
			</label>
		</form>

		<div>
			<span class="section-title">Definition</span>
			<pre class="json-preview">{JSON.stringify($selectedWidget.widget, null, 2)}</pre>
		</div>
	{:else}
		<p class="muted">Select a widget to edit its properties.</p>
	{/if}

	<div>
		<span class="section-title">Board CSS</span>
		<textarea rows={4} bind:value={boardCss} on:change={updateBoardTheme} placeholder={'body { }'}></textarea>
	</div>
</div>
