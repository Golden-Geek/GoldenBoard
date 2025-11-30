<script lang="ts">
	import type { Board } from '$lib/types/board';

	export let board: Board | null = null;
	export let css = '';
	export let onCssChange: (value: string) => void = () => {};

	let editableCss = css;
	let lastPropCss = css;

	$: if (css !== lastPropCss) {
		lastPropCss = css;
		editableCss = css;
	}

	const handleCssCommit = () => {
		onCssChange(editableCss);
	};
</script>

{#if board}
	<div class="property-list" aria-live="polite">
		<div class="property-row">
			<span class="property-label">Board Name</span>
			<input type="text" value={board.name} disabled />
		</div>
		<div class="property-row">
			<span class="property-label">Board ID</span>
			<input type="text" value={board.id} disabled />
		</div>
		<div class="property-row stacked">
			<span class="property-label">Board CSS</span>
			<textarea rows={6} bind:value={editableCss} on:change={handleCssCommit} placeholder={'body { }'}></textarea>
		</div>
	</div>
{:else}
	<p class="muted empty-state">No board selected.</p>
{/if}
