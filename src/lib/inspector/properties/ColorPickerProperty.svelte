<script lang="ts">
	let { targets, property = $bindable(), onUpdate = null } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

{#if target}
	<label class="checkbox-property">
		<span>{property.label}</span>
		<input
			type="color"
			bind:value={property.value}
			onblur={() => onUpdate && onUpdate()}
			aria-label={property.label}
		/>
	</label>
{/if}

<style>
	/* .checkbox-property {
	} */
</style>
