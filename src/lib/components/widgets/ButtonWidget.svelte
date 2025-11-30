<script lang="ts">
	import type { ButtonWidget } from '$lib/types/widgets';

	export let widget: ButtonWidget;
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

	$: active = coerceBoolean(value);

	const handleClick = () => {
		if (isEditMode) return;
		onChange(!active);
	};
</script>

<button
	type="button"
	class={`boolean-button ${active ? 'active' : ''}`}
	disabled={isEditMode}
	aria-pressed={active}
	on:click|stopPropagation={handleClick}
>
	{label || widget.label}
</button>

<style>
	.boolean-button {
		width: 100%;
		padding: 0.45rem 0.8rem;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.04);
		color: inherit;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
	}

	.boolean-button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
	}

	.boolean-button:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.boolean-button.active {
		background: var(--accent);
		border-color: var(--accent);
		color: #050403;
	}
</style>
