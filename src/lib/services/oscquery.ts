import { writable } from 'svelte/store';
import type { BindingValue } from '$lib/types/binding';

export type OscValueType =
	| 'container'
	| 'float'
	| 'int'
	| 'string'
	| 'color'
	| 'boolean'
	| 'trigger'
	| 'unknown';

export type OscHostInfo = {
	name: string;
	oscIp?: string;
	oscPort?: number;
	transport?: string;
	websocketPort?: number;
	extensions?: string[];
	metadata?: Record<string, unknown>;
};

export type OscNode = {
	path: string;
	name: string;
	description?: string;
	type: OscValueType;
	access?: number;
	children?: OscNode[];
	min?: number;
	max?: number;
	step?: number;
	enumValues?: (string | number)[];
	default?: BindingValue;
};

type OscQueryRange = {
	MIN?: number;
	MAX?: number;
	STEP?: number;
	VALS?: (string | number)[];
};

type OscQueryNode = {
	DESCRIPTION?: string;
	FULL_PATH?: string;
	ACCESS?: number;
	TYPE?: string;
	EXTENDED_TYPE?: string[];
	RANGE?: OscQueryRange[];
	VALUE?: BindingValue[];
	CONTENTS?: Record<string, OscQueryNode>;
};

type HostInfoResponse = Record<string, unknown> & { HOST_INFO?: Record<string, unknown> };

export type OscStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const CONTAINER_HINTS = new Set([
	'Container',
	'Manager',
	'BaseItem',
	'OSC',
	'Module',
	'CVGroup',
	'State',
	'Sequence'
]);

const mockHostInfo: OscHostInfo = {
	name: 'Mock OSC Server',
	oscIp: '127.0.0.1',
	oscPort: 12000,
	transport: 'udp'
};

const mockTree: OscNode = {
	path: '/',
	name: 'root',
	description: 'Root',
	type: 'container',
	children: [
		{
			path: '/modules',
			name: 'modules',
			description: 'Modules',
			type: 'container',
			children: [
				{
					path: '/modules/osc',
					name: 'osc',
					description: 'OSC',
					type: 'container',
					children: [
						{
							path: '/modules/osc/enabled',
							name: 'enabled',
							description: 'Enabled',
							type: 'boolean',
							default: true
						},
						{
							path: '/modules/osc/color',
							name: 'color',
							description: 'Color',
							type: 'color',
							default: 'ff474747'
						},
						{
							path: '/modules/osc/parameters/networkInterface',
							name: 'networkInterface',
							description: 'Network Interface',
							type: 'string',
							enumValues: ['Auto', 'Loopback', 'Ethernet', 'Wi-Fi'],
							default: 'Auto'
						},
						{
							path: '/modules/osc/parameters/oscInput/localPort',
							name: 'localPort',
							description: 'Local Port',
							type: 'int',
							min: 1,
							max: 65535,
							default: 12000
						},
						{
							path: '/modules/osc/parameters/oscOutputs/oscOutput/remotePort',
							name: 'remotePort',
							description: 'Remote Port',
							type: 'int',
							min: 1,
							max: 65535,
							default: 9000
						}
					]
				}
			]
		},
		{
			path: '/states',
			name: 'states',
			description: 'States',
			type: 'container',
			children: [
				{
					path: '/states/snapGridMode',
					name: 'snapGridMode',
					description: 'Snap Grid Mode',
					type: 'boolean',
					default: false
				},
				{
					path: '/states/snapGridSize',
					name: 'snapGridSize',
					description: 'Snap Grid Size',
					type: 'int',
					min: 4,
					max: 1000,
					default: 20
				},
				{
					path: '/states/state/color',
					name: 'color',
					description: 'State Color',
					type: 'color',
					default: 'ff363636'
				}
			]
		}
	]
};

function normalizePath(path?: string): string {
	if (!path || !path.trim()) {
		return '/';
	}
	return path.startsWith('/') ? path : `/${path}`;
}

function normalizeEndpoint(endpoint: string): string {
	return endpoint.replace(/\/+$/, '');
}

function deriveName(path: string): string {
	if (path === '/' || !path) {
		return 'root';
	}
	const segments = path.split('/').filter(Boolean);
	return segments[segments.length - 1] ?? 'node';
}

function isContainerType(type?: string): boolean {
	return type ? CONTAINER_HINTS.has(type) : false;
}

function determineNodeType(type?: string, extended?: string[]): OscValueType {
	switch (type) {
		case 'f':
		case 'ff':
		case 'fff':
			return 'float';
		case 'i':
		case 'h':
			return 'int';
		case 's':
			return 'string';
		case 'r':
			return 'color';
		case 'T':
			return 'boolean';
		case 'N':
			return 'trigger';
		default:
			break;
	}
	if (extended?.some((entry) => entry.toLowerCase().includes('color'))) {
		return 'color';
	}
	return 'unknown';
}

function extractRangeMeta(rangeList?: OscQueryRange[]) {
	const meta: { min?: number; max?: number; step?: number; enumValues?: (string | number)[] } = {};
	if (!rangeList?.length) {
		return meta;
	}
	const [range] = rangeList;
	if (typeof range.MIN === 'number') meta.min = range.MIN;
	if (typeof range.MAX === 'number') meta.max = range.MAX;
	if (typeof range.STEP === 'number') meta.step = range.STEP;
	if (Array.isArray(range.VALS)) meta.enumValues = range.VALS;
	return meta;
}

function normalizeHostInfo(data: HostInfoResponse): OscHostInfo {
	const payloadCandidate =
		data && typeof data === 'object' && data.HOST_INFO && typeof data.HOST_INFO === 'object'
			? data.HOST_INFO
			: data;
	const payload = payloadCandidate && typeof payloadCandidate === 'object' ? payloadCandidate : {};
	const toStringValue = (value: unknown): string | undefined =>
		typeof value === 'string' && value.trim().length ? value : undefined;
	const toNumberValue = (value: unknown): number | undefined =>
		typeof value === 'number' && Number.isFinite(value) ? value : undefined;
	const toStringArray = (value: unknown): string[] | undefined =>
		Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : undefined;
	const info: OscHostInfo = {
		name: toStringValue((payload as Record<string, unknown>).NAME) ?? 'OSC Server',
		oscIp: toStringValue((payload as Record<string, unknown>).OSC_IP),
		oscPort: toNumberValue((payload as Record<string, unknown>).OSC_PORT),
		transport: toStringValue((payload as Record<string, unknown>).OSC_TRANSPORT),
		websocketPort: toNumberValue((payload as Record<string, unknown>).OSC_WEBSOCKET_PORT),
		extensions: toStringArray((payload as Record<string, unknown>).EXTENSIONS),
		metadata: { ...(payload as Record<string, unknown>) }
	};
	return info;
}

async function requestJson<T>(url: string): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Request failed: ${response.status} ${response.statusText}`);
	}
	return (await response.json()) as T;
}

async function fetchHostInfo(base: string): Promise<OscHostInfo> {
	const url = `${base}/?HOST_INFO`;
	const raw = await requestJson<HostInfoResponse>(url);
	return normalizeHostInfo(raw);
}

async function fetchStructure(base: string): Promise<OscNode> {
	const candidates = ['/?JSON', '/oscquery.json', '/'];
	let lastError: unknown;
	for (const suffix of candidates) {
		try {
			const raw = await requestJson<OscQueryNode>(`${base}${suffix}`);
			return parseOscTree(raw);
		} catch (error) {
			lastError = error;
		}
	}
	console.warn('OSCQuery structure fetch failed for all known endpoints', lastError);
	throw new Error('Unable to load OSCQuery tree from endpoint');
}

function parseOscTree(raw: OscQueryNode): OscNode {
	const path = normalizePath(raw.FULL_PATH);
	const children = raw.CONTENTS ? Object.values(raw.CONTENTS).map(parseOscTree) : undefined;
	const hasChildren = (children?.length ?? 0) > 0;
	const explicitContainer = isContainerType(raw.TYPE);
	const node: OscNode = {
		path,
		name: deriveName(path),
		description: raw.DESCRIPTION,
		type: hasChildren || explicitContainer ? 'container' : determineNodeType(raw.TYPE, raw.EXTENDED_TYPE),
		access: raw.ACCESS
	};
	if (children?.length) {
		node.children = children.sort((a, b) => a.name.localeCompare(b.name));
		return node;
	}
	if (node.type === 'container') {
		return node;
	}
	const rangeMeta = extractRangeMeta(raw.RANGE);
	if (typeof rangeMeta.min === 'number') node.min = rangeMeta.min;
	if (typeof rangeMeta.max === 'number') node.max = rangeMeta.max;
	if (typeof rangeMeta.step === 'number') node.step = rangeMeta.step;
	if (rangeMeta.enumValues?.length) node.enumValues = rangeMeta.enumValues;
	let defaultValue = raw.VALUE?.length ? raw.VALUE[0] : undefined;
	if (defaultValue === undefined && node.enumValues?.length) {
		defaultValue = node.enumValues[0] as BindingValue;
	}
	if (defaultValue === undefined && typeof node.min === 'number') {
		defaultValue = node.min;
	}
	node.default = defaultValue ?? null;
	return node;
}

function flatten(node: OscNode, acc: Record<string, BindingValue> = {}): Record<string, BindingValue> {
	if (node.type !== 'container') {
		acc[node.path] = node.default ?? null;
	}
	node.children?.forEach((child) => flatten(child, acc));
	return acc;
}

export function createOscClient() {
	const status = writable<OscStatus>('disconnected');
	const structure = writable<OscNode>(mockTree);
	const values = writable<Record<string, BindingValue>>(flatten(mockTree));
	const hostInfo = writable<OscHostInfo>(mockHostInfo);

	let mockInterval: ReturnType<typeof setInterval> | undefined;
	let currentEndpoint = '';

	async function connect(endpoint: string) {
		status.set('connecting');
		currentEndpoint = normalizeEndpoint(endpoint || '');
		try {
			const info = await fetchHostInfo(currentEndpoint);
			hostInfo.set(info);
			const tree = await fetchStructure(currentEndpoint);
			structure.set(tree);
			values.set(flatten(tree));
			status.set('connected');
			startMockUpdates(tree);
		} catch (error) {
			console.warn('OSCQuery connection failed, falling back to mock data', error);
			hostInfo.set(mockHostInfo);
			structure.set(mockTree);
			values.set(flatten(mockTree));
			status.set('error');
			startMockUpdates(mockTree);
		}
	}

	function startMockUpdates(tree: OscNode) {
		if (mockInterval) clearInterval(mockInterval);
		const leafPaths = Object.keys(flatten(tree));
		mockInterval = setInterval(() => {
			values.update((prev) => {
				const next = { ...prev };
				for (const path of leafPaths) {
					const current = prev[path];
					if (typeof current === 'number') {
						next[path] = +(current + (Math.random() - 0.5) * 0.05).toFixed(3);
					}
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

	function setValue(path: string, value: BindingValue) {
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
		hostInfo: { subscribe: hostInfo.subscribe },
		values: { subscribe: values.subscribe },
		connect,
		disconnect,
		setValue
	};
}

export type OscClient = ReturnType<typeof createOscClient>;
