import { writable } from 'svelte/store';
import { ParametersManager } from './Parameter';
import { ControlStructure } from './ControlStructure';

export const hostInfoStore = writable(null);
export const websocketConnectionStatusStore = writable(3);
