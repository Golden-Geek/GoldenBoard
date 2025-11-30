<script lang="ts">
	import type { CheckboxWidget } from '$lib/types/widgets';

	export let widget: CheckboxWidget;
	export let value: boolean | number | string | null = false;
	export let isEditMode = false;
	export let onChange: (value: boolean) => void = () => {};
	export let label = '';

	const coerceBoolean = (input: boolean | number | string | null): boolean => {
		if (input === true) return true;
		if (input === false || input === null) return false;
		if (typeof input === 'number') return input !== 0;
		return String(input).toLowerCase() === 'true';
	};

	$: checked = coerceBoolean(value);

	const handleChange = () => {
		if (isEditMode) return;
		onChange(!checked);
	};
</script>

<label class="checkbox-field">
	<input
		type="checkbox"
		checked={checked}
		disabled={isEditMode}
		on:change|stopPropagation={handleChange}
		aria-label={label || widget.label}
	/>
	<span>{checked ? 'On' : 'Off'}</span>
</label>

<style>
	.checkbox-field {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.85rem;
	}

	.checkbox-field input[type='checkbox'] {
		width: 18px;
		height: 18px;
		accent-color: var(--accent);
	}

	.checkbox-field span {
		color: var(--muted);
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
</style>
