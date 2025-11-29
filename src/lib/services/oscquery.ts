import { writable } from 'svelte/store';

export type OscNode = {
	path: string;
	name: string;
	type: 'container' | 'float' | 'int' | 'string' | 'color';
	children?: OscNode[];
	min?: number;
	max?: number;
	step?: number;
	default?: number | string;
};

export type OscStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const mockTree: OscNode = {
	path: '/',
	name: 'root',
	type: 'container',
	children: [
		{
			path: '/synth',
			name: 'synth',
			type: 'container',
			children: [
				{ path: '/synth/freq', name: 'frequency', type: 'float', min: 20, max: 20000, step: 0.1 },
				{ path: '/synth/gain', name: 'gain', type: 'float', min: 0, max: 1, step: 0.01 },
				{ path: '/synth/wave', name: 'waveform', type: 'string' },
				{ path: '/synth/filter/cutoff', name: 'cutoff', type: 'float', min: 20, max: 18000, step: 1 }
			]
		},
		{
			path: '/mixer',
			name: 'mixer',
			type: 'container',
			children: [
				{ path: '/mixer/chan1', name: 'channel 1', type: 'float', min: 0, max: 1, step: 0.01 },
				{ path: '/mixer/chan2', name: 'channel 2', type: 'float', min: 0, max: 1, step: 0.01 },
				{ path: '/mixer/master', name: 'master', type: 'float', min: 0, max: 1, step: 0.01 }
			]
		}
	]
};

function flatten(node: OscNode, acc: Record<string, number | string> = {}): Record<string, number | string> {
	if (node.type !== 'container') {
		acc[node.path] = node.default ?? 0;
	}
	node.children?.forEach((child) => flatten(child, acc));
	return acc;
}

export function createOscClient() {
	const status = writable<OscStatus>('disconnected');
	const structure = writable<OscNode>(mockTree);
	const values = writable<Record<string, number | string>>(flatten(mockTree));

	let mockInterval: ReturnType<typeof setInterval> | undefined;
	let currentEndpoint = '';

	async function connect(endpoint: string) {
		status.set('connecting');
		currentEndpoint = endpoint;
		try {
			const response = await fetch(`${endpoint}/oscquery.json`);
			if (!response.ok) throw new Error('Failed to fetch OSCQuery structure');
			const tree = (await response.json()) as OscNode;
			structure.set(tree);
			values.set(flatten(tree));
			status.set('connected');
			startMockUpdates(tree);
		} catch (error) {
			console.warn('OSCQuery connection failed, falling back to mock data', error);
			structure.set(mockTree);
			values.set(flatten(mockTree));
			status.set('error');
			startMockUpdates(mockTree);
		}
	}

	function startMockUpdates(tree: OscNode) {
		if (mockInterval) clearInterval(mockInterval);
		const source = flatten(tree);
		mockInterval = setInterval(() => {
			values.update((prev) => {
				const next = { ...prev };
				for (const key of Object.keys(source)) {
					const base = typeof prev[key] === 'number' ? (prev[key] as number) : 0;
					next[key] = +(base + (Math.random() - 0.5) * 0.05).toFixed(3);
				}
				return next;
			});
		}, 2000);
	}

	function disconnect() {
		if (mockInterval) {
			clearInterval(mockInterval);
			mockInterval = undefined;
		}
		status.set('disconnected');
	}

	function setValue(path: string, value: number | string) {
		values.update((prev) => ({ ...prev, [path]: value }));
		if (currentEndpoint) {
			fetch(`${currentEndpoint}/osc`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path, value })
			}).catch((error) => console.warn('OSC send failed', error));
		}
	}

	return {
		status: { subscribe: status.subscribe },
		structure: { subscribe: structure.subscribe },
		values: { subscribe: values.subscribe },
		connect,
		disconnect,
		setValue
	};
}

export type OscClient = ReturnType<typeof createOscClient>;
