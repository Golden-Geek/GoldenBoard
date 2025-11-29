<script lang="ts">
	import type { IntStepperWidget } from '$lib/types/widgets';
	import type { BindingContext } from '$lib/types/binding';
	import { resolveBinding } from '$lib/types/binding';

	export let widget: IntStepperWidget;
	export let ctx: BindingContext;
	export let value: number | string | null = 0;
	export let isEditMode = false;
	export let onChange: (value: number) => void = () => {};

	const resolveStep = (): number => {
		const binding = widget.props?.step;
		const resolved = binding ? resolveBinding(binding, ctx) : undefined;
		return typeof resolved === 'number' ? resolved : 1;
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

<div class="control int-stepper">
	<input
		type="number"
		step={resolveStep()}
		value={numericValue()}
		disabled={isEditMode}
		on:change={(event) => commit(parseInt((event.target as HTMLInputElement).value, 10))}
	/>
</div>

<style>
	.int-stepper {
		display: flex;
	}

	.int-stepper input {
		width: 100%;
	}
</style>
