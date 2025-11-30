import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { createOscClient } from '$lib/services/oscquery';
import type { BindingValue } from '$lib/types/binding';

const client = createOscClient();
const DEFAULT_ENDPOINT = 'http://localhost:42000';

export const oscStatus = client.status;
export const oscStructure = client.structure;
export const oscValues = client.values;
export const oscHostInfo = client.hostInfo;
export const oscEndpoint = writable(DEFAULT_ENDPOINT);

if (browser) {
	client.connect(DEFAULT_ENDPOINT);
}

export function connectOsc(endpoint: string): void {
	oscEndpoint.set(endpoint);
	client.connect(endpoint);
}

export function pushOscValue(path: string, value: BindingValue): void {
	client.setValue(path, value);
}

export function disconnectOsc(): void {
	client.disconnect();
}
