<script lang="ts">
    import { EditMode, editMode } from '$lib/editor/editor.svelte';
</script>

<div class="topbar">
	<p class="title">Golden Board v{PKG.version}</p>

    <div class="spacer"></div>
	<div class="menu"></div>

    <div class="spacer"></div>
	<div class="mode-switch">
		<button on:click={() => {
            $editMode = $editMode === EditMode.Live ? EditMode.Edit : EditMode.Live;
        }}>
			Switch to {$editMode === EditMode.Edit ? 'Live' : 'Edit'}
		</button>
	</div>
</div>

<style>
	.topbar {
		height: 40px;
		border-bottom: 1px solid var(--border-color);
		/* background-color: var(--panel-bg); */
		display: flex;
		align-items: center;
		padding: 0 10px;
		box-sizing: border-box;
		background-color: var(--panel-bg-color);
        color: rgba(from var(--text-color) r g b / 30%);
        font-weight: bold;
        text-transform: uppercase;
	}

    .spacer {
        flex-grow: 1;
    }
</style>
