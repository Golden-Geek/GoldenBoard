<script lang="ts">
	let { onclick } = $props();
</script>

<button class="icon-button remove-button" aria-label="Remove server" {onclick}>
	<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" />
		<line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" />
	</svg>
</button>

<style>
	.remove-button {
		background-color: rgba(255, 0, 0, 0.5);
		border-radius: 4px;
	}

	.remove-button:hover {
		background-color: rgba(255, 0, 0, 0.8);
	}

	svg {
		display: block;
		transition: color 0.2s;
	}

	.remove-button svg {
		color: rgb(232, 169, 169);
		width: 12px;
		height: 12px;
	}

	.icon-button:hover svg {
		color: #ffffff;
	}
</style>
