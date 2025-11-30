<script lang="ts">
	import type { MomentaryButtonWidget } from '$lib/types/widgets';

	export let widget: MomentaryButtonWidget;
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

	let localPressed = false;
	$: resolvedPressed = coerceBoolean(value);
	$: visualPressed = resolvedPressed || localPressed;

	const press = () => {
		if (isEditMode || localPressed) return;
		localPressed = true;
		onChange(true);
	};

	const release = () => {
		if (isEditMode || !localPressed) return;
		localPressed = false;
		onChange(false);
	};

	const handlePointerDown = (event: PointerEvent) => {
		if (isEditMode) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		press();
		event.preventDefault();
		event.stopPropagation();
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (isEditMode) return;
		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			press();
		}
	};

	const handleKeyup = (event: KeyboardEvent) => {
		if (isEditMode) return;
		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			release();
		}
	};
</script>

<svelte:window on:pointerup={release} on:pointercancel={release} />

<button
	type="button"
	class={`momentary-button ${visualPressed ? 'active' : ''}`}
	disabled={isEditMode}
	aria-pressed={visualPressed}
	data-pressed={visualPressed}
	on:pointerdown={handlePointerDown}
	on:pointerleave={release}
	on:keydown={handleKeydown}
	on:keyup={handleKeyup}
	on:click|stopPropagation|preventDefault={() => {}}
>
	{label || widget.label}
</button>

<style>
	.momentary-button {
		width: 100%;
		padding: 0.5rem 0.85rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.05);
		color: inherit;
		font-size: 0.85rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		transition: transform 60ms ease, background 120ms ease, border-color 120ms ease;
	}

	.momentary-button:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.momentary-button.active {
		background: var(--accent);
		border-color: var(--accent);
		color: #050403;
		transform: scale(0.98);
	}
</style>
