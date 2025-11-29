<script lang="ts">
	import type { BindingValue } from '$lib/types/binding';

	export let value: BindingValue = '';
	export let isEditMode = false;
	export let onInput: (value: string) => void = () => {};

	const commit = (next: string) => {
		if (isEditMode) return;
		onInput(next);
	};
</script>

<div class="control text-field">
	<input type="text" value={value ?? ''} disabled={isEditMode} on:input={(event) => commit((event.target as HTMLInputElement).value)} />
</div>

<style>
	.text-field {
		display: flex;
	}

	.text-field input {
		width: 100%;
	}
</style>
