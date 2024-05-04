<script>
  import UIComponent from "$lib/editor/components/UIComponent.svelte";
  import { editMode } from "$lib/editor/store";
  import { layout } from "$lib/editor/store";

  function onKeyDown(event) {
    if (event.key == "e") {
      editMode.set(!$editMode);
    }
  }
</script>

<UIComponent layoutData={$layout.main} />
<slot />

<svelte:window on:keydown={onKeyDown} />

<style>
  :global(body) {
    position:absolute;
    width:100%;
    height:100%;
    font-family: "Helvetica Neue", sans-serif;
    background-color: #222;
    color: #ccc;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
</style>
