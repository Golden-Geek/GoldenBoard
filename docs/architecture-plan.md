# Golden Board Dashboard Plan

## Core Concepts
- **OSCQuery integration**: `src/lib/services/oscquery.ts` exposes `fetchOscTree(endpoint)` and `subscribeToParam(path, callback)` with a mock backend when the network call fails. The service caches the structure for the session and exposes a writable store to broadcast updates.
- **Board data model**: `src/lib/types/board.ts` defines discriminated unions for `Widget`, `ContainerWidget`, and `Board`. Each instance stores metadata, bindings, layout info, css overrides, and arbitrary property bags. Boards are persisted in localStorage and can be exported/imported as JSON.
- **Global state stores**: `src/lib/stores/boards.ts` manages all boards, current selection, clipboard, and undo history. `src/lib/stores/oscquery.ts` mirrors the remote tree.
- **Widget property binding**: every widget property is represented as `{ kind: 'literal' | 'osc' | 'widget' | 'expression', value: string }`. Helpers resolve bindings at runtime and handle bi-directional sync with OSC nodes.
- **Boolean + trigger widgets**: Toggle, checkbox, latched button, and momentary trigger widgets provide dedicated affordances for boolean parameters and impulse-style OSC nodes.

## UI Regions
1. **Top toolbar**: board switcher, add/remove board actions, undo/redo, import/export JSON, OSC endpoint connect button.
2. **Left widget palette**: Photoshop-like vertical toolbar for creating widgets; drag onto the board canvas or click to insert.
3. **Center canvas**: renders the nested container structure using layout-aware components (stack, grid, tabs, accordion, free positioning). Drag-and-drop reordering uses `@dnd-kit/core`.
4. **Right inspector**: shows editable properties for the selected board/container/widget, plus raw JSON preview for the node.
5. **Bottom console**: optional log panel for OSC traffic and evaluation errors (collapsed by default).

## Styling
- Base theme defined in `src/lib/styles/theme.css` with CSS variables for typography, spacing, shadows, and colors.
- Components consume the variables via `:global(:root)` plus per-widget `css` property merged as inline styles.
- Dark, subtle neumorphic styling with micro interactions handled via `@keyframes fade-in` and CSS transitions.

## Implementation Phases
1. **Data + services**
   - Define types and stores for boards/widgets.
   - Stub OSCQuery service with mock data and connection lifecycle events.
2. **UI skeleton**
   - Layout the shell (toolbar, sidebar, canvas, inspector).
   - Implement board switching and selection logic.
3. **Widget palette + canvas**
   - Render containers recursively according to layout type.
   - Support widget creation, drag/drop, and selection.
4. **Inspector + bindings**
   - Form controls for editing label/value/bindings.
   - JSON viewer of selected node definition.
5. **Persistence + customization**
   - Save boards to localStorage, allow JSON import/export.
   - Add custom widget registration and CSS overrides.

## Enhancements to Propose
- In-app OSC monitor showing live values per binding.
- Template gallery for board presets.
- Collaboration mode stub (future) via WebSocket provider.
