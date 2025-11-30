# Golden Board

A Svelte 5 dashboard editor for building OSC-driven control boards with nested layouts, Photoshop-like tooling, and a live inspector.

## Features
- **OSCQuery integration** – Connect to a remote OSCQuery endpoint (or fall back to the built-in mock tree) to browse, drag, and bind parameters bi-directionally.
- **Board + widget modeling** – Infinite container nesting with sliders, steppers, text fields, color pickers, rotary controls, toggles, checkboxes, latching buttons, and momentary triggers. Entire board structure stored and exportable as JSON.
- **Photoshop-style tooling** – Palette for native widgets, OSC tree drag-and-drop, custom widget import/export, and multi-board management.
- **Inspector + bindings** – Inspect any widget, edit bindings (literal / OSC / widget / expression), tweak per-widget CSS, and preview the backing JSON snippet.
- **Styling system** – Dark, modern theme with small radii, subtle shadows, and per-board/per-widget CSS overrides.

## Getting Started

```sh
npm install
npm run dev
```

Then open the printed URL (default `http://localhost:5173`).

### Node requirement
The current toolchain expects **Node 20.19+** (or 22.12+). If you are on 20.18, development works with mocked OSC data but `npm install` will warn; upgrade Node to remove the warning.

## OSCQuery workflow
1. Enter your OSCQuery endpoint (e.g. `http://localhost:53000`) in the toolbar and press **Connect OSC**.
2. Browse the OSC tree in the left column.
3. Drag a leaf node onto any container in the canvas to auto-create a slider bound to that parameter (bi-directional sync with anti-feedback safeguards in the store).
4. Use the inspector to refine bindings, add transforms, or switch to expressions.

## Custom widgets
1. Author a widget JSON file that matches the schema in `src/lib/types/widgets.ts`.
2. Load it via **Load Custom Widget** in the palette.
3. Drag or click to instantiate it anywhere on the board. Widgets are stored with the board for later reuse/export.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server with hot module reload |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production output |
| `npm run lint` | Run ESLint + Prettier checks |
| `npm run test:unit` | Execute Vitest unit/component tests |
| `npm run test:e2e` | Launch Playwright end-to-end tests |

## Project structure highlights
- `src/lib/types` – Core data models for bindings, widgets, and boards.
- `src/lib/stores` – Svelte stores for OSCQuery, boards, and runtime binding contexts.
- `src/lib/components` – Toolbar, palette, canvas, inspector, and widget renderer components.
- `src/lib/services/oscquery.ts` – Client responsible for fetching or mocking OSCQuery structures and broadcasting value updates.

Feel free to extend the plan in `docs/architecture-plan.md` for future iterations (OSC monitor, collaborative editing, presets, etc.).
