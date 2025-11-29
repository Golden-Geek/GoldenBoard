import { writable } from 'svelte/store';
import { createOscClient } from '$lib/services/oscquery';

const client = createOscClient();

export const oscStatus = client.status;
export const oscStructure = client.structure;
export const oscValues = client.values;
export const oscEndpoint = writable('http://localhost:42000');

export function connectOsc(endpoint: string): void {
	oscEndpoint.set(endpoint);
	client.connect(endpoint);
}

export function pushOscValue(path: string, value: number | string): void {
	client.setValue(path, value);
}

export function disconnectOsc(): void {
	client.disconnect();
}
