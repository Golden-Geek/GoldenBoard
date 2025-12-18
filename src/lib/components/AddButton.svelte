<script lang="ts">
	let { onclick } = $props();
</script>

<button aria-label="Add server" class="icon-button add-button" {onclick}>
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
		<line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2" />
		<line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" />
	</svg>
</button>

<style>
	.add-button {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 16px;
		padding: 4px;
		transition: background-color 0.2s;
	}

	.add-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.add-button:active {
		background-color: rgba(255, 255, 255, 0.2);
	}

    svg {
        color: #0f6c9b;
		display: block;
		transition: color 0.2s;
	}

	.add-button:hover svg{
		color: #61b4e4;
	}

</style>
