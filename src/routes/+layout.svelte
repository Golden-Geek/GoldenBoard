<script context="module">
  export const ssr = false;
</script>

<script>
  import "$lib/global.css";

  import Inspector from "$lib/editor/inspector/Inspector.svelte";
  import TopBar from "$lib/editor/toolbars/TopBar.svelte";
  import Outliner from "$lib/editor/outliner/Outliner.svelte";
  import BoardEditor from "$lib/editor/board/BoardEditor.svelte";

  import { editorState } from "$lib/editor/editor.svelte.js";
  import { removeComponent } from "$lib/boards.svelte";
  import ServerExplorer from "$lib/editor/oscquery/ServerExplorer.svelte";

  function onKeyDown(e) {
    switch (e.key) {
      case "e":
        if (e.ctrlKey) {
          editorState.editMode = !editorState.editMode;
          if (!editorState.editMode) editorState.selectedComponents = [];
          e.preventDefault();
        }
        break;
      case "o":
        if (e.ctrlKey && editorState.editMode) {
          editorState.leftPanelOpen = !editorState.leftPanelOpen;
          e.preventDefault();
        }
        break;

      case "i":
        if (e.ctrlKey && editorState.editMode) {
          editorState.inspectorOpen = !editorState.inspectorOpen;
          e.preventDefault();
        }
        break;

      case "z":
        if (e.ctrlKey && editorState.editMode) {
          // undo();
          e.preventDefault();
        }
        break;

      case "y":
        if (e.ctrlKey && editorState.editMode) {
          // redo();
          e.preventDefault();
        }
        break;

      case "Escape":
        if (editorState.editMode) editorState.selectedComponents = [];
        e.preventDefault();
        break;

      case "Delete":
        if (editorState.editMode) {
          editorState.selectedComponents.forEach((comp) =>
            removeComponent(null, comp),
          );
          e.preventDefault();
        }
    }
  }
</script>

<div class="main">
  <div class="leftPanel" class:open={editorState.editMode && editorState.leftPanelOpen}
  >
    <Outliner />
    <ServerExplorer  />
  </div>
  <div class="main-center">
    <TopBar />
      <BoardEditor />
  </div>

  <Inspector />
</div>

<slot />

<svelte:window onkeydowncapture={onKeyDown} />

<style>
  .main {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    overflow: hidden;
    transition: width 0.3s ease;
  }

  .leftPanel {
    position: relative;
    height: 100%;
    color: #ccc;
    overflow: hidden;
    background-color: #333;
    box-shadow: 10px 0 10px rgba(0, 0, 0, 0.3);
    flex: 0 0 0px;
    transition: flex-basis 0.3s ease;
    z-index: 1;
    display:flex;
    flex-direction: column;
  }

  .leftPanel.open {
    position: relative;
    flex-basis: 400px;
  }

  .main-center {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    height: 100%;
    overflow: auto;
  }

  
</style>
