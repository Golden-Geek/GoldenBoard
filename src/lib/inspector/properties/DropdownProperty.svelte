<script lang="ts">
	let { targets, property = $bindable(), definition, onUpdate = null } = $props();
	let target = $derived(targets.length > 0 ? targets[0] : null);
</script>

<select
	class="dropdown-property"
	bind:value={property.value}
	onchange={() => onUpdate && onUpdate()}
>
	{#each Object.entries(definition.options) as [optionKey, optionLabel]}
		<option value={optionKey}>{optionLabel}</option>
	{/each}
</select>

<style>
	.dropdown-property {
		background-color: #222222;
		border: 1px solid rgba(from var(--border-color) / 30%);
		border-radius: 0.5em;
	}
</style>
