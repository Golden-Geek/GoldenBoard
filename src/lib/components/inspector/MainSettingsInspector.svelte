<script lang="ts">
	export let showLiveBoards = false;
	export let showEditLiveButtons = true;
	export let globalCss = '';
	export let onToggleBoards: (value: boolean) => void = () => {};
	export let onToggleEditLiveButtons: (value: boolean) => void = () => {};
	export let onGlobalCssChange: (value: string) => void = () => {};

	let editableCss = globalCss;
	let lastPropCss = globalCss;

	$: if (globalCss !== lastPropCss) {
		lastPropCss = globalCss;
		editableCss = globalCss;
	}

	const handleShowBoardsToggle = (event: Event) => {
		const checked = (event.target as HTMLInputElement).checked;
		onToggleBoards(checked);
	};

	const handleEditLiveToggle = (event: Event) => {
		const checked = (event.target as HTMLInputElement).checked;
		onToggleEditLiveButtons(!checked);
	};

	const handleCssCommit = () => {
		onGlobalCssChange(editableCss);
	};
</script>

<div class="property-list" aria-live="polite">
	<div class="property-row">
		<span class="property-label">Show Boards List</span>
		<label class="toggle" aria-label="Show boards list in live mode">
			<input type="checkbox" checked={showLiveBoards} on:change={handleShowBoardsToggle} />
		</label>
		<span class="property-label">Show Edit/Live Buttons</span>
		<label class="toggle" aria-label="Show edit/live mode buttons">
			<input type="checkbox" checked={!showEditLiveButtons} on:change={handleEditLiveToggle} />
		</label>
	</div>
	<div class="property-row stacked">
		<span class="property-label">Global CSS</span>
		<textarea rows={6} bind:value={editableCss} on:input={handleCssCommit} placeholder={':root { }'}
		></textarea>
	</div>
</div>
