<script lang="ts">
	let { targets, property = $bindable(), onStartEdit = null, onUpdate = null } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

{#if target}
	<label class="checkbox-property">
		<span>{property.label}</span>
		<input
			type="color"
			bind:value={property.value}
			onfocus={() => onStartEdit && onStartEdit(property.value)}
			onblur={() => onUpdate && onUpdate()}
			aria-label={property.label}
			style="--value-color: {property.value}"
		/>
	</label>
{/if}

<style>
	.checkbox-property input {
		padding: 0;
		background-color: transparent;
		/* border-radius: 5em; */
	}

	input[type='color'] {
		/* --webkit-appearance: none; */
		border: none;
		width: 2.5em;
		height: 0.9em;
		border-radius: 0.25rem;
		border: solid 1px color-mix(in srgb, var(--value-color), white 40%);
		box-sizing: content-box;
	}

	input[type='color']::-webkit-color-swatch-wrapper {
		padding: 0;
	}
	input[type='color']::-webkit-color-swatch {
		border: none;
	}
</style>
