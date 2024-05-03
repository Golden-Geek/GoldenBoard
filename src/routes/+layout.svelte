<script>
  import Button from "$lib/editor/components/parameters/Button.svelte";
  import Slider from "$lib/editor/components/parameters/Slider.svelte";
  import UIComponent from "$lib/editor/components/UIComponent.svelte";
  import { editMode } from "$lib/editor/store";

  function onKeyDown(event) {
    console.log(event.key);
    if (event.key == "e") {
      editMode.set(!$editMode);
    }
  }
</script>

<UIComponent options={{ label: "But", type: Button }} />
<UIComponent options={{ label: "Sli", type: Slider }} />
<slot />

<svelte:window on:keydown={onKeyDown} />

<style>
  :global(body) {
    font-family: "Helvetica Neue", sans-serif;
    background-color: #222;
    color: #ccc;
    margin: 0;
    padding: 0;
  }
</style>
