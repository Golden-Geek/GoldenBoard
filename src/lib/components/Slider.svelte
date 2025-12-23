<script lang="ts">
	let {
		value = $bindable(),
		min,
		max,
		step = 0,
		sensitivity = 1,
		orientation = 'horizontal',
		disabled = false,
		onStartEdit = null,
		onEndEdit = null,
		onValueChange = null,
		bgColor = 'var(--slider-bg)',
		fgColor = 'var(--slider-fg)'
	} = $props();

	$inspect(min, max);
	let infiniteMode = $derived(min === undefined || max === undefined);
	let sliderDiv = $state(null as HTMLDivElement | null);
	let sliderWidth = $derived(infiniteMode ? 100 : sliderDiv!.getBoundingClientRect().width);

	let valueAtDown = $state(0);
	let mouseAtDown = $state(0);

	let isHorizontal = $derived(orientation === 'horizontal');

	let isDragging = $derived(false);

	let midZero = $derived(min < 0 && max > 0);
	let relativeValue = $derived(
		midZero ? (value >= 0 ? value / max : value / min) : (value - min) / (max - min)
	);
	let relativeZero = $derived(midZero ? Math.abs(min) / (max - min) : 0);

	let targetLeft = $derived(
		!midZero ? 0 : value >= 0 ? relativeZero : relativeZero * (1 - relativeValue)
	);

	let targetRight = $derived(
		1 -
			(!midZero
				? relativeValue
				: value >= 0
					? relativeZero + relativeValue * (1 - relativeZero)
					: relativeZero)
	);

	$inspect(midZero, relativeValue);

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

		let alteredSensitivity = e.altKey
			? sensitivity / 10
			: e.shiftKey
				? sensitivity * 10
				: sensitivity;

		if (step > 0) {
			const stepCount = range / step;
			const pixelsPerStep = sliderWidth / stepCount / alteredSensitivity;
			const stepsMoved = Math.round(delta / pixelsPerStep);
			value = Math.min(max, Math.max(min, valueAtDown + stepsMoved * step));
		} else if (!infiniteMode) {
			const percentDelta = (delta / sliderWidth) * alteredSensitivity;
			value = Math.min(max, Math.max(min, valueAtDown + percentDelta * range));
		} else //infinite mode, no range
		{
			const valueDelta = (delta * alteredSensitivity) / 10;
			value = valueAtDown + valueDelta;
		}

		valueAtDown = value;

		onValueChange && onValueChange(value);
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

{#if infiniteMode}
	<button class="button infinite-slider {isDragging ? 'dragging' : ''}" onmousedown={startDrag}>
		{'⟷'}
	</button>
{:else}
	<div
		class="slider"
		bind:this={sliderDiv}
		onmousedown={startDrag}
		style="--bg-color: {bgColor}; --fg-color: {fgColor}"
	>
		<div
			class="slider-foreground {midZero ? 'mid-zero' : ''}"
			style="--value: {(value - min) / (max - min)};  --left:{targetLeft *
				100}%; --right:{targetRight * 100}%"
		></div>
	</div>
{/if}

<style>
	.slider {
		min-width: 6rem;
		position: relative;
		height: 1rem;
		user-select: none;
		border-radius: 0.5rem;
		overflow: hidden;
		background: var(--bg-color);
		border: none;
	}

	.slider-foreground {
		position: absolute;
		padding: 0;
		margin: 0;
		left: var(--left);
		right: var(--right);
		top: 0;
		height: 100%;
		/* border-radius: 12px 0 0 12px; */
		background: var(--fg-color);
		/* width: calc(var(--value) * 100%); */
		pointer-events: none;
	}

	.slider-foreground.mid-zero {
		min-width: 1px;
	}

	/* Hide cursor globally when dragging */
	:global(.slider-hide-cursor) {
		cursor: none !important;
	}

	.infinite-slider {
		background: none;
		border: none;
		font-size: 0.6rem;
		cursor: ew-resize;
	}

	.infinite-slider:hover,
	.infinite-slider.dragging {
		background-color: rgba(from var(--panel-bg-color) r g b / 10%);
	}
</style>
