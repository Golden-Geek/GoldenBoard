<script lang="ts">
	import type { BindingValue } from '$lib/types/binding';

	export let value: BindingValue = '#ffffff';
	export let isEditMode = false;
	export let onInput: (value: string) => void = () => {};

	const commit = (next: string) => {
		if (isEditMode) return;
		onInput(next);
	};
</script>

<div class="control color-picker">
	<input type="color" value={(value as string) ?? '#ffffff'} disabled={isEditMode} on:input={(event) => commit((event.target as HTMLInputElement).value)} />
</div>

<style>
	.color-picker {
		display: inline-flex;
	}

	.color-picker input {
		width: 42px;
		height: 28px;
		padding: 0;
	}
</style>
