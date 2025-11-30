<script lang="ts">
	import type { ToggleWidget } from '$lib/types/widgets';

	export let widget: ToggleWidget;
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

	const toggle = () => {
		if (isEditMode) return;
		onChange(!checked);
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (isEditMode) return;
		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			onChange(!checked);
		}
	};
</script>

<button
	type="button"
	class={`toggle-switch ${checked ? 'checked' : ''}`}
	role="switch"
	tabindex={isEditMode ? -1 : 0}
	aria-checked={checked}
	aria-label={label || widget.label}
	disabled={isEditMode}
	on:click|stopPropagation={toggle}
	on:keydown={handleKeydown}
>
	<span class="track">
		<span class="thumb"></span>
	</span>
</button>

<style>
	.toggle-switch {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 46px;
		height: 24px;
		padding: 0;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.05);
		cursor: pointer;
		transition: background 120ms ease, border-color 120ms ease, opacity 120ms ease;
	}

	.toggle-switch:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.toggle-switch .track {
		position: absolute;
		inset: 2px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.12);
	}

	.toggle-switch .thumb {
		position: absolute;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #ffffff;
		left: 3px;
		top: 3px;
		transition: transform 140ms ease;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
	}

	.toggle-switch.checked {
		border-color: var(--accent);
		background: rgba(255, 255, 255, 0.12);
	}

	.toggle-switch.checked .track {
		background: var(--accent);
	}

	.toggle-switch.checked .thumb {
		transform: translateX(22px);
	}
</style>
