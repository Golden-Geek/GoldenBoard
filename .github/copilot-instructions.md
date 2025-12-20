# Copilot instructions (GoldenBoard)

This repository uses **Svelte 5 (runes)** and **SvelteKit 2**.

## Hard requirements

- Prefer **Svelte 5 runes** (e.g. `$state`, `$derived`, `$effect`) over Svelte 3/4 patterns.
- Avoid recommending legacy patterns unless the code already uses them and changing would be risky:
  - Avoid `writable/derived` stores for new state unless there’s a clear need.
  - Avoid `createEventDispatcher` for new components; prefer callback props or component events where appropriate.
- Target **TypeScript-first** solutions (this repo uses `.svelte.ts` modules).

## Documentation / correctness

- When answering Svelte/SvelteKit questions, **use the Svelte MCP tools** to stay current:
  1. Call `list-sections` first.
  2. Then call `get-documentation` for all relevant sections.
  3. When proposing or editing Svelte code, run `svelte-autofixer` and incorporate fixes.

## Project context hints

- Styling uses Tailwind (see `tailwindcss` dependency); don’t introduce new design tokens or hard-coded colors.
- Build target is static (adapter-static, `build/` output). Avoid solutions requiring server-side runtime features.
- All CSS sizes should use relative units (rem, em, %, vw, vh); avoid px unless absolutely necessary.

