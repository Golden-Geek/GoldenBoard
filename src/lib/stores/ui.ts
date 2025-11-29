import { writable } from 'svelte/store';

export type EditorMode = 'live' | 'edit';

const DEFAULT_MODE: EditorMode = 'edit';

export const editorMode = writable<EditorMode>(DEFAULT_MODE);

export function setEditorMode(mode: EditorMode): void {
	editorMode.set(mode);
}

export function toggleEditorMode(): void {
	editorMode.update((mode) => (mode === 'live' ? 'edit' : 'live'));
}
