import { writable } from 'svelte/store';
import { ParametersManager } from './Parameter';


export const hostInfoStore = writable(null);
export const websocketConnectionStatusStore = writable(3);
