<script lang="ts">
	import { EditMode } from '$lib/editor/editor.svelte';
	import { clearData, mainData, saveData } from '$lib/engine.svelte';
	import WidgetBar from '$lib/widget/WidgetBar.svelte';

	let editMode = $derived(mainData.editor.editMode == EditMode.Edit);
</script>

<div class="topbar">
	<p class="title">Golden Board v{PKG.version}</p>

	<div class="spacer"></div>
	<WidgetBar></WidgetBar>

	<div class="spacer"></div>
	<div class="mode-switch">
		<button
			onclick={() => {
				mainData.editor.editMode = editMode ? EditMode.Live : EditMode.Edit;
			}}
		>
			Switch to {editMode ? 'Live' : 'Edit'}
		</button>

		<button onclick={() => saveData()}> Save </button>
		<button onclick={() => clearData()}> Clear </button>
	</div>
</div>

<style>
	.topbar {
		height: 40px;
		display: flex;
		align-items: center;
		padding: 0 10px;
		box-sizing: border-box;
		background-color: var(--panel-bg-color);
		color: rgba(from var(--text-color) r g b / 30%);
		font-weight: bold;
		text-transform: uppercase;
		box-shadow: 1px 1px 5px rgba(0, 0, 0, 1);
	}

	.spacer {
		flex-grow: 1;
	}
</style>
