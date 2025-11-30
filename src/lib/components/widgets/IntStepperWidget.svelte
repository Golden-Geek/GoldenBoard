<script lang="ts">
	import type { IntStepperWidget } from '$lib/types/widgets';
	import { resolveBinding, type Binding, type BindingContext } from '$lib/types/binding';

	export let widget: IntStepperWidget;
	export let ctx: BindingContext;
	export let value: number | string | null = 0;
	export let isEditMode = false;
	export let onChange: (value: number) => void = () => {};

	const resolveStep = (
		binding: Binding | undefined,
		context: BindingContext,
		fallback: number
	): number => {
		const resolved = binding ? resolveBinding(binding, context) : undefined;
		return typeof resolved === 'number' ? resolved : fallback;
	};

	const toNumeric = (input: number | string | null): number => {
		const num = Number(input);
		return Number.isNaN(num) ? 0 : num;
	};

	const commit = (next: number) => {
		if (isEditMode || Number.isNaN(next)) return;
		onChange(next);
	};

	let stepValue = resolveStep(widget.props?.step, ctx, 1);
	let displayValue = toNumeric(value);

	$: stepValue = resolveStep(widget.props?.step, ctx, 1);
	$: displayValue = toNumeric(value);
</script>

<div class="control int-stepper">
	<input
		type="number"
			step={stepValue}
			value={displayValue}
		disabled={isEditMode}
		on:change={(event) => commit(parseInt((event.target as HTMLInputElement).value, 10))}
	/>
</div>

<style>
	.int-stepper {
		display: flex;
	}

	.int-stepper input {
		width: 120px;
		max-width: 100%;
		font-size: 0.85rem;
		padding: 0.25rem 0.4rem;
	}
</style>
