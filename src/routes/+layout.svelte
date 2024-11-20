<script context="module">
  export const ssr = false;
</script>

<script>
  import "$lib/global.css";

  import Inspector from "$lib/editor/inspector/Inspector.svelte";
  import TopBar from "$lib/editor/toolbars/TopBar.svelte";
  import OutlinersPanel from "$lib/editor/outliner/Outliner.svelte";
  import BoardEditor from "$lib/editor/board/BoardEditor.svelte";

  import { editorState } from "$lib/editor/editor.svelte.js";
    import { removeComponent } from "$lib/boards.svelte";

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
          editorState.outlinerOpen = !editorState.outlinerOpen;
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
        if(editorState.editMode) {
          editorState.selectedComponents.forEach(comp => removeComponent(null, comp));
          e.preventDefault();
        }
    }
  }
</script>

<div class="main">
  <OutlinersPanel />
  <div class="main-center">
    <TopBar />
    <div class="content">
      <BoardEditor />
    </div>
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
