import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export type EditorMode = 'live' | 'edit';

export interface MainSettings {
	showLiveBoards: boolean;
	globalCss: string;
}

const DEFAULT_MODE: EditorMode = 'edit';
const SETTINGS_KEY = 'goldenboard:main-settings';
const DEFAULT_SETTINGS: MainSettings = {
	showLiveBoards: true,
	globalCss: ''
};

export const editorMode = writable<EditorMode>(DEFAULT_MODE);
export const mainSettings = writable<MainSettings>(loadSettings());

export function setEditorMode(mode: EditorMode): void {
	editorMode.set(mode);
}

export function toggleEditorMode(): void {
	editorMode.update((mode) => (mode === 'live' ? 'edit' : 'live'));
}

export function updateMainSettings(patch: Partial<MainSettings>): void {
	mainSettings.update((current) => ({ ...current, ...patch }));
}

function loadSettings(): MainSettings {
	if (!browser) return DEFAULT_SETTINGS;
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (!raw) return DEFAULT_SETTINGS;
		const parsed = JSON.parse(raw) as Partial<MainSettings>;
		return { ...DEFAULT_SETTINGS, ...parsed };
	} catch (error) {
		console.warn('Failed to load main settings', error);
		return DEFAULT_SETTINGS;
	}
}

if (browser) {
	mainSettings.subscribe((value) => {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
	});
}
