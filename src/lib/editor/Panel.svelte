<script lang="ts">
	export let name: string;
</script>

<div class="panel">
	<p class="panel-title">{name}</p>
	<slot />
</div>

<style>
	.panel {
		background-color: var(--panel-bg-color);
		height: 100%;
		border-radius: 0.5rem;
		border: solid 1px rgba(78, 78, 78, 0.2);
		color: var(--text-color);
		padding: 0.5rem;
		position: relative;
	}

	.panel-title {
		position: absolute;
		right: 0.5rem;
		top: 0.2rem;
		font-size: 1.1rem;
		font-weight: bold;
		text-align: center;
		color: rgba(from var(--text-color) r g b / 10%);
		text-transform: uppercase;
		margin: 0 0 0.5rem 0;
	}

	:global(.mode-live) .panel-title {
		display: none;
	}
</style>
