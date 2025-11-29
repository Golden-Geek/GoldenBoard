<script lang="ts">
	import type { SliderWidget } from '$lib/types/widgets';
	import type { BindingContext } from '$lib/types/binding';
	import { resolveBinding } from '$lib/types/binding';

	export let widget: SliderWidget;
	export let ctx: BindingContext;
	export let value: number | string | null = 0;
	export let isEditMode = false;
	export let onChange: (value: number) => void = () => {};

	const resolveProp = (key: 'min' | 'max' | 'step', fallback: number): number => {
		const binding = widget.props?.[key];
		const resolved = binding ? resolveBinding(binding, ctx) : undefined;
		return typeof resolved === 'number' ? resolved : fallback;
	};

	const commit = (next: number) => {
		if (isEditMode || Number.isNaN(next)) return;
		onChange(next);
	};

	const numericValue = () => {
		const num = Number(value);
		return Number.isNaN(num) ? 0 : num;
	};
</script>

<div class="control slider-control">
	<input
		type="range"
		min={resolveProp('min', 0)}
		max={resolveProp('max', 1)}
		step={resolveProp('step', 0.01)}
		value={numericValue()}
		disabled={isEditMode}
		on:input={(event) => commit(parseFloat((event.target as HTMLInputElement).value))}
	/>
	<input
		type="number"
		value={numericValue()}
		disabled={isEditMode}
		on:change={(event) => commit(parseFloat((event.target as HTMLInputElement).value))}
	/>
</div>

<style>
	.slider-control {
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}

	.slider-control input[type='range'] {
		flex: 1;
	}

	.slider-control input[type='number'] {
		width: 80px;
	}
</style>
