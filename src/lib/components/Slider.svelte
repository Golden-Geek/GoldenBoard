<script lang="ts">
	import { onMount } from 'svelte';

	let {
		value = $bindable(),
		min = 0,
		max = 1,
		step = 0,
		sensitivity = 1,
		orientation = 'horizontal',
		disabled = false,
		onStartEdit = null,
		onEndEdit = null
	} = $props();

	let sliderDiv = $state(null as HTMLDivElement | null);
	let sliderWidth = $derived(sliderDiv!.getBoundingClientRect().width);

	let valueAtDown = $state(0);
	let mouseAtDown = $state(0);

	let isHorizontal = $derived(orientation === 'horizontal');

	let isDragging = $derived(false);

	function startDrag(e: MouseEvent) {
		isDragging = true;
		onStartEdit && onStartEdit(value);
		mouseAtDown = isHorizontal ? e.clientX : e.clientY;
		valueAtDown = value;

		document.addEventListener('mousemove', dragUpdate);
		document.addEventListener('mouseup', stopDrag);

		// Hide mouse pointer globally by adding a CSS class
		document.body.classList.add('slider-hide-cursor');
	}

	function dragUpdate(e: MouseEvent) {
		if (!isDragging) return;
		const delta = isHorizontal ? e.movementX : e.movementY;
		const range = max - min;

		if (step > 0) {
			const stepCount = range / step;
			const pixelsPerStep = sliderWidth / stepCount / sensitivity;
			const stepsMoved = Math.round(delta / pixelsPerStep);
			value = Math.min(max, Math.max(min, valueAtDown + stepsMoved * step));
		} else {
			const percentDelta = (delta / sliderWidth) * sensitivity;
			value = Math.min(max, Math.max(min, valueAtDown + percentDelta * range));
		}

		valueAtDown = value;
	}

	function stopDrag(e: MouseEvent) {
		if (!isDragging) return;
		isDragging = false;
		// Remove the global cursor-hiding class
		document.body.classList.remove('slider-hide-cursor');

		isDragging = false;
		onEndEdit && onEndEdit(value);
	}
</script>

<div class="slider" bind:this={sliderDiv} onmousedown={startDrag}>
	<div class="slider-foreground" style="--value: {(value - min) / (max - min)}"></div>
</div>

<style>
	.slider {
		position: relative;
		min-width: 100px;
		height: 1rem;
		user-select: none;
		border-radius: 0.5rem;
		overflow: hidden;
		background: var(--slider-bg);
	}

	.slider-foreground {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		border-radius: 12px 0 0 12px;
		background: var(--slider-fg);
		width: calc(var(--value) * 100%);
		pointer-events: none;
	}
	/* Hide cursor globally when dragging */
	:global(.slider-hide-cursor) {
		cursor: none !important;
	}
</style>
