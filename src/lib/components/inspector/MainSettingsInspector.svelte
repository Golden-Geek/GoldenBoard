<script lang="ts">
	export let showLiveBoards = false;
	export let globalCss = '';
	export let onToggleBoards: (value: boolean) => void = () => {};
	export let onGlobalCssChange: (value: string) => void = () => {};

	let editableCss = globalCss;
	let lastPropCss = globalCss;

	$: if (globalCss !== lastPropCss) {
		lastPropCss = globalCss;
		editableCss = globalCss;
	}

	const handleToggle = (event: Event) => {
		const checked = (event.target as HTMLInputElement).checked;
		onToggleBoards(checked);
	};

	const handleCssCommit = () => {
		onGlobalCssChange(editableCss);
	};
</script>

<div class="property-list" aria-live="polite">
	<div class="property-row">
		<span class="property-label">Show Boards List</span>
		<label class="toggle" aria-label="Show boards list in live mode">
			<input type="checkbox" checked={showLiveBoards} on:change={handleToggle} />
		</label>
	</div>
	<div class="property-row stacked">
		<span class="property-label">Global CSS</span>
		<textarea rows={6} bind:value={editableCss} on:input={handleCssCommit} placeholder={':root { }'}></textarea>
	</div>
</div>
