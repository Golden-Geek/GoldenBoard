import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export type EditorMode = 'live' | 'edit' | 'loading';
export type InspectorView = 'widget' | 'board' | 'settings';

export interface MainSettings {
	showLiveBoards: boolean;
	showEditLiveButtons: boolean;
	globalCss: string;
}

const DEFAULT_MODE: EditorMode = 'loading';
const SETTINGS_KEY = 'goldenboard:main-settings';
const EDITOR_MODE_KEY = 'goldenboard:editor-mode';
const DEFAULT_SETTINGS: MainSettings = {
	showLiveBoards: true,
	showEditLiveButtons: true,
	globalCss: ''
};

function loadEditorMode(): EditorMode {
	if (!browser) return DEFAULT_MODE;
	try {
		const raw = localStorage.getItem(EDITOR_MODE_KEY);
		if (raw === 'live') return 'live';
		return 'edit';
	} catch (error) {
		return DEFAULT_MODE;
	}
}

export const editorMode = writable<EditorMode>(loadEditorMode());
export const mainSettings = writable<MainSettings>(loadSettings());
export const inspectorView = writable<InspectorView>('widget');

export function setEditorMode(mode: EditorMode): void {
	editorMode.set(mode);
}

export function toggleEditorMode(): void {
	editorMode.update((mode) => (mode === 'live' ? 'edit' : 'live'));
}

export function updateMainSettings(patch: Partial<MainSettings>): void {
	mainSettings.update((current) => ({ ...current, ...patch }));
}

export function setInspectorView(view: InspectorView): void {
	inspectorView.set(view);
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

	editorMode.subscribe((value) => {
		try {
			localStorage.setItem(EDITOR_MODE_KEY, value);
		} catch (error) {
			// ignore storage errors
		}
	});
}
