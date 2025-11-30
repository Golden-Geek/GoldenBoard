<script lang="ts">
	import { tick } from 'svelte';
	import type { SliderWidget } from '$lib/types/widgets';
	import type { BindingContext } from '$lib/types/binding';
	import { resolveBinding } from '$lib/types/binding';

	export let widget: SliderWidget;
	export let ctx: BindingContext;
	export let value: number | string | null = 0;
	export let isEditMode = false;
	export let onChange: (value: number) => void = () => {};
	export let label = '';

	const resolveProp = (key: 'min' | 'max' | 'step', fallback: number): number => {
		const binding = widget.props?.[key];
		const resolved = binding ? resolveBinding(binding, ctx) : undefined;
		return typeof resolved === 'number' ? resolved : fallback;
	};

	const numericValue = () => {
		const num = Number(value);
		return Number.isNaN(num) ? 0 : num;
	};

	let resolvedValue = numericValue();
	let pendingValue: number | null = null;
	let currentValue = resolvedValue;

	let trackRef: HTMLDivElement | null = null;
	let calloutRef: HTMLDivElement | null = null;
	let calloutInput: HTMLInputElement | null = null;
	let isDragging = false;
	let activePointerId: number | null = null;
	let dragStartClientX = 0;
	let dragStartValue = 0;
	let showCallout = false;
	let calloutInputValue = '';
	let calloutLeft = 0;
	let percentage = 0;
	let suppressNextDrag = false;

	$: resolvedValue = numericValue();
	$: minValue = resolveProp('min', 0);
	$: maxValue = resolveProp('max', 1);
	$: stepValue = resolveProp('step', 0.01);
	$: range = Math.max(0.000001, maxValue - minValue);
	$: {
		if (pendingValue !== null) {
			const tolerance = stepValue || range / 1000 || 0.000001;
			if (Math.abs(resolvedValue - pendingValue) <= tolerance) {
				pendingValue = null;
			}
		}
	}
	$: currentValue = pendingValue ?? resolvedValue;
	$: percentage = Math.min(100, Math.max(0, ((currentValue - minValue) / range) * 100));

	const clampValue = (next: number) => Math.min(maxValue, Math.max(minValue, next));
	const snapValue = (next: number) => {
		const clamped = clampValue(next);
		if (!stepValue) return clamped;
		const steps = Math.round((clamped - minValue) / stepValue);
		return minValue + steps * stepValue;
	};

	const commit = (next: number) => {
		if (isEditMode || Number.isNaN(next)) return;
		const snapped = snapValue(next);
		if (snapped === currentValue) return;
		pendingValue = snapped;
		onChange(snapped);
	};

	const handlePointerDown = (event: PointerEvent) => {
		if (isEditMode) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		if (suppressNextDrag) {
			suppressNextDrag = false;
			return;
		}
		isDragging = true;
		activePointerId = event.pointerId;
		trackRef?.setPointerCapture?.(event.pointerId);
		dragStartClientX = event.clientX;
		dragStartValue = currentValue;
		event.stopPropagation();
		event.preventDefault();
	};

	const handlePointerMove = (event: PointerEvent) => {
		if (!isDragging || (activePointerId !== null && event.pointerId !== activePointerId)) return;
		const rect = trackRef?.getBoundingClientRect();
		if (!rect) return;
		const deltaRatio = (event.clientX - dragStartClientX) / rect.width;
		const next = dragStartValue + deltaRatio * range;
		commit(next);
	};

	const endPointer = (event: PointerEvent) => {
		if (!isDragging || (activePointerId !== null && event.pointerId !== activePointerId)) return;
		isDragging = false;
		trackRef?.releasePointerCapture?.(event.pointerId);
		activePointerId = null;
	};

	const openCallout = async (event: MouseEvent) => {
		if (isEditMode) return;
		suppressNextDrag = true;
		const rect = trackRef?.getBoundingClientRect();
		const relativeX = rect ? event.clientX - rect.left : 0;
		calloutLeft = rect ? Math.min(rect.width - 12, Math.max(12, relativeX)) : relativeX;
		calloutInputValue = String(currentValue);
		showCallout = true;
		await tick();
		calloutInput?.focus();
		calloutInput?.select();
	};

	const confirmCallout = () => {
		const parsed = parseFloat(calloutInputValue);
		if (!Number.isNaN(parsed)) {
			commit(parsed);
		}
		showCallout = false;
	};

	const handleCalloutKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			confirmCallout();
		} else if (event.key === 'Escape') {
			showCallout = false;
		}
	};

	const handleGlobalPointerDown = (event: PointerEvent) => {
		if (!showCallout) return;
		if (!calloutRef?.contains(event.target as Node)) {
			showCallout = false;
		}
	};

	const handleRootMouseDown = (event: MouseEvent) => {
		if (isEditMode) return;
		event.stopPropagation();
	};

	const handleRootClick = (event: MouseEvent) => {
		if (isEditMode) return;
		event.stopPropagation();
	};

	const handleTrackDoubleClick = (event: MouseEvent) => {
		if (isEditMode) return;
		event.stopPropagation();
		event.preventDefault();
		openCallout(event);
	};

	const adjustByStep = (multiplier: number) => {
		const delta = stepValue || range / 100;
		commit(currentValue + delta * multiplier);
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (isEditMode) return;
		switch (event.key) {
			case 'ArrowLeft':
			case 'ArrowDown':
				event.preventDefault();
				adjustByStep(-1);
				break;
			case 'ArrowRight':
			case 'ArrowUp':
				event.preventDefault();
				adjustByStep(1);
				break;
			case 'Home':
				event.preventDefault();
				commit(minValue);
				break;
			case 'End':
				event.preventDefault();
				commit(maxValue);
				break;
		}
	};
</script>

<svelte:window
	on:pointermove={handlePointerMove}
	on:pointerup={endPointer}
	on:pointercancel={endPointer}
	on:pointerdown={handleGlobalPointerDown}
/>

<div
	class={`slider-root ${isDragging ? 'dragging' : ''}`}
	tabindex={isEditMode ? -1 : 0}
	role="slider"
	aria-valuemin={minValue}
	aria-valuemax={maxValue}
	aria-valuenow={currentValue}
	aria-valuetext={currentValue.toFixed(2)}
	aria-disabled={isEditMode}
	aria-label={label}
	on:keydown={isEditMode ? undefined : handleKeydown}
	on:click={handleRootClick}
	on:mousedown={handleRootMouseDown}
>
	<div
		class="slider-track"
		role="presentation"
		aria-hidden="true"
		bind:this={trackRef}
		on:pointerdown={handlePointerDown}
		on:dblclick={handleTrackDoubleClick}
	>
		<div class="slider-fill" style={`width: ${percentage}%`}></div>
		<div class="slider-overlay">
			<span class="slider-label">{label}</span>
			<span class="slider-value">{currentValue.toFixed(2)}</span>
		</div>
		{#if showCallout}
			<div class="slider-callout" bind:this={calloutRef} style={`left: ${calloutLeft}px`}>
				<input
					type="number"
					bind:this={calloutInput}
					value={calloutInputValue}
					min={minValue}
					max={maxValue}
					step={stepValue || undefined}
					on:input={(event) => (calloutInputValue = (event.target as HTMLInputElement).value)}
					on:keydown={handleCalloutKeydown}
				/>
				<button type="button" on:click={confirmCallout}>Set</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.slider-root {
		position: relative;
		display: block;
		width: 100%;
		padding: 0.35rem 0;
		outline: none;
	}

	.slider-root:focus-visible .slider-track {
		box-shadow: 0 0 0 1px var(--accent), 0 0 22px rgba(245, 182, 76, 0.35);
	}

	.slider-root.dragging .slider-track {
		cursor: ew-resize;
	}

	.slider-track {
		position: relative;
		width: 100%;
		height: 40px;
		border-radius: 999px;
		background: linear-gradient(180deg, rgba(18, 46, 32, 0.95), rgba(8, 20, 14, 0.95));
		border: 1px solid rgba(102, 255, 187, 0.35);
		box-shadow:
			inset 0 1px 0 rgba(126, 255, 203, 0.4),
			inset 0 -2px 0 rgba(0, 0, 0, 0.5),
			0 16px 28px rgba(2, 8, 5, 0.55);
		overflow: hidden;
		cursor: pointer;
	}

	.slider-track::after {
		content: '';
		position: absolute;
		inset: 2px;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.35);
		pointer-events: none;
		z-index: 0;
	}

	.slider-fill {
		position: absolute;
		top: 0;
		left: 0;
		bottom: 0;
		background: linear-gradient(90deg, #00d778, #5bffb2 55%, #b8ffd7);
		box-shadow: inset 0 0 12px rgba(2, 78, 47, 0.6), 0 0 20px rgba(0, 230, 140, 0.55);
		z-index: 1;
	}

	.slider-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1rem;
		pointer-events: none;
		font-size: 0.85rem;
		color: #eafff5;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.65);
		z-index: 2;
	}

	.slider-label {
		text-transform: uppercase;
		letter-spacing: 0.18em;
	}

	.slider-value {
		font-variant-numeric: tabular-nums;
	}

	.slider-callout {
		position: absolute;
		bottom: 100%;
		transform: translate(-50%, -0.4rem);
		background: var(--panel);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 6px;
		padding: 0.35rem;
		display: flex;
		gap: 0.35rem;
		align-items: center;
		box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
		z-index: 5;
	}

	.slider-callout input {
		width: 90px;
		font-size: 0.8rem;
		padding: 0.2rem 0.35rem;
	}

	.slider-callout button {
		padding: 0.15rem 0.5rem;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}
</style>
