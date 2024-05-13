<script context="module">
  import controlStructure from "$lib/oscquery/oscquery";

  controlStructure.oscQueryClient.connect(
    "http://127.0.0.1:42000",
    () => {
      console.log("Connected to OSCQuery Server");
    },
  );
</script>

<script>
  import UIComponent from "$lib/editor/components/UIComponent.svelte";
  import Inspector from "$lib/editor/inspector/Inspector.svelte";
  import ComponentToolBox from "$lib/editor/toolbars/ComponentToolBox.svelte";
  import {
    editMode,
    inspectorOpen,
    outlinerOpen,
    selectedComponents,
    undo,
  } from "$lib/editor/store";
  import { layout } from "$lib/editor/store";
    import TopBar from "$lib/editor/toolbars/TopBar.svelte";
    import OutlinersPanel from "$lib/editor/outliner/OutlinersPanel.svelte";


  function onKeyDown(e) {
    switch (e.key) {
      case "e":
        if (e.ctrlKey) {
          editMode.set(!$editMode);
          if (!$editMode) selectedComponents.set([]);
          e.preventDefault();
        }
        break;
      case "o":
        if (e.ctrlKey && $editMode) {
          outlinerOpen.set(!$outlinerOpen);
          e.preventDefault();
        }
        break;

      case "i":
        if (e.ctrlKey && $editMode) {
          inspectorOpen.set(!$inspectorOpen);
          e.preventDefault();
        }
        break;

      case "z":
        if (e.ctrlKey && $editMode) {
          undo.undo();
          e.preventDefault();
        }
        break;

      case "y":
        if (e.ctrlKey && $editMode) {
          undo.redo();
          e.preventDefault();
        }
        break;

      case "Escape":
        if ($editMode) selectedComponents.set([]);
    }
  }
</script>

<div class="main">
    <OutlinersPanel />
  <div class="main-center">
    <TopBar />
    <div class="content">
      {#key $layout.main}
        <UIComponent layoutData={$layout.main} isMain={true} />
      {/key}
    </div>
    <ComponentToolBox />
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
    width: 100%;
    height: 100%;
    overflow: hidden;
    transition: width 0.3s ease;
  }

  .main-center {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    height: 100%;
    overflow: auto;
  }

  .content {
    flex-grow: 1;
    overflow: auto;
  }
</style>
