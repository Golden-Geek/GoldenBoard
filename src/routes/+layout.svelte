<script>
  import UIComponent from "$lib/editor/components/UIComponent.svelte";
  import Inspector from "$lib/editor/inspector/Inspector.svelte";
    import Outliner from "$lib/editor/outliner/Outliner.svelte";
  import { editMode, outlinerOpen, selectedComponents } from "$lib/editor/store";
  import { layout } from "$lib/editor/store";

  function onKeyDown(event) {
    switch(event.key)
    {
      case "e":  editMode.set(!$editMode); break;
      case "o":  outlinerOpen.set(!$outlinerOpen); break;
      case 'Escape': selectedComponents.set([]);
    }
  }
</script>

<div class="main">
  <Outliner />
  <div class="content">
    <UIComponent bind:layoutData={$layout.main} />
  </div>
  <Inspector />
</div>

<slot />

<svelte:window on:keydown={onKeyDown} />

<style>
  :global(body) {
    position: absolute;
    width: 100%;
    height: 100%;
    font-family: "Helvetica Neue", sans-serif;
    background-color: #222;
    color: #ccc;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .main {
    display: flex;
    flex-direction: row;
    width:100%;
    height: 100%;
    overflow: hidden;
    transition: width 0.3s ease;
  }

  .content
  {
    flex-grow: 1;
    overflow: auto;
  }
</style>
