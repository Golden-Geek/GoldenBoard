<script lang="ts">
	import type { RotaryWidget } from '$lib/types/widgets';
	import type { BindingContext } from '$lib/types/binding';
	import { resolveBinding } from '$lib/types/binding';

	export let widget: RotaryWidget;
	export let ctx: BindingContext;
	export let value: number | string | null = 0;
	export let isEditMode = false;
	export let onChange: (value: number) => void = () => {};

	const resolveProp = (key: 'min' | 'max' | 'step', fallback: number): number => {
		const binding = widget.props?.[key];
		const resolved = binding ? resolveBinding(binding, ctx) : undefined;
		return typeof resolved === 'number' ? resolved : fallback;
	};

	const numericValue = () => {
		const num = Number(value);
		return Number.isNaN(num) ? 0 : num;
	};

	const commit = (next: number) => {
		if (isEditMode || Number.isNaN(next)) return;
		onChange(next);
	};
</script>

<div class="rotary-control">
	<input
		type="range"
		min={resolveProp('min', 0)}
		max={resolveProp('max', 1)}
		step={resolveProp('step', 0.01)}
		value={numericValue()}
		disabled={isEditMode}
		on:input={(event) => commit(parseFloat((event.target as HTMLInputElement).value))}
	/>
	<span>{numericValue().toFixed(2)}</span>
</div>

<style>
	.rotary-control {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.rotary-control input[type='range'] {
		flex: 1;
		min-width: 0;
	}

	.rotary-control span {
		font-variant-numeric: tabular-nums;
		font-size: 0.8rem;
		color: var(--muted);
		min-width: 48px;
		text-align: right;
	}
</style>
