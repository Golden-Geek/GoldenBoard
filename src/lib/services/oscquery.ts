import { writable, get } from 'svelte/store';
import type { BindingValue } from '$lib/types/binding';
import { decodeOscPacket, encodeOscMessage } from '$lib/utils/osc';
import type { OscDecodedMessage } from '$lib/utils/osc';

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
	wsIp?: string;
	wsPort?: number;
	wsPath?: string;
	extensions?: Record<string, boolean>;
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
	MIN?: number | string;
	MAX?: number | string;
	STEP?: number | string;
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
type ValueResponse = { VALUE?: BindingValue[] } & Record<string, unknown>;

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
	transport: 'udp',
	wsPort: 12000,
	extensions: { LISTEN: true, PATH_CHANGED: true }
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

function toFiniteNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === 'string') {
		const parsed = Number(value.trim());
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return undefined;
}

function extractRangeMeta(rangeList?: OscQueryRange[]) {
	const meta: { min?: number; max?: number; step?: number; enumValues?: (string | number)[] } = {};
	if (!rangeList?.length) {
		return meta;
	}
	const [range] = rangeList;
	const min = toFiniteNumber(range.MIN);
	const max = toFiniteNumber(range.MAX);
	const step = toFiniteNumber(range.STEP);
	if (min !== undefined) meta.min = min;
	if (max !== undefined) meta.max = max;
	if (step !== undefined) meta.step = step;
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
	const toBooleanRecord = (value: unknown): Record<string, boolean> | undefined => {
		if (!value || typeof value !== 'object') return undefined;
		const record: Record<string, boolean> = {};
		for (const [key, entry] of Object.entries(value)) {
			if (typeof entry === 'boolean') {
				record[key] = entry;
			}
		}
		return Object.keys(record).length ? record : undefined;
	};
	const source = payload as Record<string, unknown>;
	const info: OscHostInfo = {
		name: toStringValue(source['NAME']) ?? 'OSC Server',
		oscIp: toStringValue(source['OSC_IP']),
		oscPort: toNumberValue(source['OSC_PORT']),
		transport: toStringValue(source['OSC_TRANSPORT']),
		websocketPort: toNumberValue(source['OSC_WEBSOCKET_PORT']),
		wsIp: toStringValue(source['WS_IP']),
		wsPort: toNumberValue(source['WS_PORT']),
		wsPath: toStringValue(source['WS_PATH']),
		extensions: toBooleanRecord(source['EXTENSIONS']),
		metadata: { ...source }
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

function buildNodeIndex(node: OscNode, map: Map<string, OscNode> = new Map()): Map<string, OscNode> {
	map.set(node.path, node);
	node.children?.forEach((child) => buildNodeIndex(child, map));
	return map;
}

function isReadable(node?: OscNode): boolean {
	if (!node) return false;
	if (node.type === 'container') return false;
	if (typeof node.access !== 'number') return true;
	return (node.access & 0b01) !== 0;
}

function collectLeafPaths(node: OscNode, acc: string[] = []): string[] {
	if (isReadable(node)) {
		acc.push(node.path);
	}
	node.children?.forEach((child) => collectLeafPaths(child, acc));
	return acc;
}

function mergeValues(
	previous: Record<string, BindingValue>,
	defaults: Record<string, BindingValue>
): Record<string, BindingValue> {
	const next: Record<string, BindingValue> = {};
	for (const [path, defaultValue] of Object.entries(defaults)) {
		next[path] = path in previous ? previous[path] : defaultValue ?? null;
	}
	return next;
}

export function createOscClient() {
	const status = writable<OscStatus>('disconnected');
	const structure = writable<OscNode>(mockTree);
	const values = writable<Record<string, BindingValue>>(flatten(mockTree));
	const hostInfo = writable<OscHostInfo>(mockHostInfo);

	let mockInterval: ReturnType<typeof setInterval> | undefined;
	let reconnectHandle: ReturnType<typeof setTimeout> | undefined;
	let websocket: WebSocket | null = null;
	let disconnecting = false;
	let pendingFrames: (string | ArrayBuffer)[] = [];
	let streamingEnabled = false;
	let currentEndpoint = '';
	let currentNodeIndex = buildNodeIndex(mockTree);
	let userSubscriptions = new Set<string>();
	let desiredSubscriptions = new Set<string>();
	let activeSubscriptions = new Set<string>();
	let lastHostInfo: OscHostInfo = mockHostInfo;
	let connectionAttempt = 0;
	const triggerResetTimers = new Map<string, ReturnType<typeof setTimeout>>();
	const pendingValueFetches = new Map<string, Promise<void>>();

	function stopMockUpdates() {
		if (mockInterval) {
			clearInterval(mockInterval);
			mockInterval = undefined;
		}
	}

	function startMockUpdates(tree: OscNode) {
		stopMockUpdates();
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

	function clearReconnectTimer() {
		if (reconnectHandle) {
			clearTimeout(reconnectHandle);
			reconnectHandle = undefined;
		}
	}

	function clearTriggerTimers() {
		for (const timer of triggerResetTimers.values()) {
			clearTimeout(timer);
		}
		triggerResetTimers.clear();
	}

	function rebuildDesiredSubscriptions() {
		desiredSubscriptions = new Set<string>(userSubscriptions);
	}

	function useMockData() {
		streamingEnabled = false;
		currentEndpoint = '';
		activeSubscriptions.clear();
		rebuildDesiredSubscriptions();
		currentNodeIndex = buildNodeIndex(mockTree);
		pendingFrames = [];
		clearReconnectTimer();
		clearTriggerTimers();
		teardownWebsocket();
		hostInfo.set(mockHostInfo);
		structure.set(mockTree);
		values.set(flatten(mockTree));
		startMockUpdates(mockTree);
		status.set('error');
	}

	function teardownWebsocket() {
		if (!websocket) return;
		websocket.removeEventListener('open', handleSocketOpen);
		websocket.removeEventListener('message', handleSocketMessage);
		websocket.removeEventListener('close', handleSocketClose);
		websocket.removeEventListener('error', handleSocketError);
		try {
			websocket.close();
		} catch {
			/* noop */
		}
		websocket = null;
	}

	function supportsStreaming(info: OscHostInfo): boolean {
		if (info.extensions && 'LISTEN' in info.extensions) {
			return Boolean(info.extensions.LISTEN);
		}
		return Boolean(info.wsPort ?? info.websocketPort ?? info.wsIp ?? info.wsPath);
	}

	function resolveWebsocketUrl(info: OscHostInfo): string | null {
		if (!currentEndpoint) return null;
		try {
			const endpointUrl = new URL(currentEndpoint);
			const protocol = endpointUrl.protocol === 'https:' ? 'wss:' : 'ws:';
			const hostname = info.wsIp ?? endpointUrl.hostname;
			const defaultPort = endpointUrl.port ? Number(endpointUrl.port) : undefined;
			const port = info.wsPort ?? info.websocketPort ?? defaultPort;
			const candidatePath = info.wsPath ?? endpointUrl.pathname ?? '/';
			const path = candidatePath.startsWith('/') ? candidatePath : `/${candidatePath}`;
			const authority = port ? `${hostname}:${port}` : hostname;
			return `${protocol}//${authority}${path}`;
		} catch (error) {
			console.warn('Failed to resolve websocket url', error);
			return null;
		}
	}

	function flushPendingFrames() {
		if (!websocket || websocket.readyState !== WebSocket.OPEN) return;
		while (pendingFrames.length) {
			const frame = pendingFrames.shift();
			if (frame === undefined) break;
			websocket.send(frame);
		}
	}

	function enqueueFrame(frame: string | ArrayBuffer) {
		if (!streamingEnabled) return;
		if (websocket && websocket.readyState === WebSocket.OPEN) {
			websocket.send(frame);
			return;
		}
		if (pendingFrames.length >= 128) {
			pendingFrames.shift();
		}
		pendingFrames.push(frame);
	}

	function sendCommand(command: string, data: unknown) {
		try {
			enqueueFrame(JSON.stringify({ COMMAND: command, DATA: data }));
		} catch (error) {
			console.warn('OSCQuery command serialization failed', error);
		}
	}

	function syncSubscriptions() {
		if (!streamingEnabled) return;
		if (!desiredSubscriptions.size) {
			for (const path of [...activeSubscriptions]) {
				sendCommand('IGNORE', path);
				activeSubscriptions.delete(path);
			}
			return;
		}
		for (const path of desiredSubscriptions) {
			if (activeSubscriptions.has(path)) continue;
			activeSubscriptions.add(path);
			console.log('OSCQuery subscribing to', path);
			sendCommand('LISTEN', path);
			ensureValueSnapshot(path);
		}
		for (const path of [...activeSubscriptions]) {
			if (desiredSubscriptions.has(path)) continue;
			console.log('OSCQuery unsubscribing from', path);
			sendCommand('IGNORE', path);
			activeSubscriptions.delete(path);
		}
	}

	function handleSocketOpen() {
		clearReconnectTimer();
		flushPendingFrames();
		syncSubscriptions();
	}

	function handleSocketMessage(event: MessageEvent) {
		const payload = event.data;
		if (typeof payload === 'string') {
			handleCommandMessage(payload);
			return;
		}
		if (payload instanceof ArrayBuffer) {
			handleBinaryPayload(payload);
			return;
		}
		if (typeof Blob !== 'undefined' && payload instanceof Blob) {
			payload
				.arrayBuffer()
				.then(handleBinaryPayload)
				.catch((error) => console.warn('OSCQuery blob decode failed', error));
		}
	}

	function handleCommandMessage(raw: string) {
		try {
			const message = JSON.parse(raw);
			const command =
				typeof message?.COMMAND === 'string'
					? message.COMMAND
					: typeof message?.command === 'string'
						? message.command
						: '';
			switch (command) {
				case 'PATH_CHANGED':
				case 'PATH_ADDED':
				case 'PATH_REMOVED':
				case 'PATH_RENAMED':
					void refreshStructure();
					break;
				default:
					break;
			}
		} catch (error) {
			console.warn('OSCQuery websocket message parse failed', error);
		}
	}

	function handleBinaryPayload(buffer: ArrayBuffer) {
		const decoded = decodeOscPacket(buffer);
		if (!decoded) return;
		applyIncomingValue(decoded);
	}

	function applyIncomingValue(message: OscDecodedMessage) {
		const nextValue = coerceIncomingValue(message);
		if (nextValue === undefined) return;
		values.update((prev) => {
			const current = prev[message.address];
			if (current === nextValue) {
				return prev;
			}
			return { ...prev, [message.address]: nextValue };
		});
		if (message.types.startsWith('N')) {
			scheduleTriggerReset(message.address);
		}
	}

	function scheduleTriggerReset(path: string) {
		const existing = triggerResetTimers.get(path);
		if (existing) clearTimeout(existing);
		const timer = setTimeout(() => {
			triggerResetTimers.delete(path);
			values.update((prev) => {
				if (!(path in prev) || prev[path] === false) return prev;
				return { ...prev, [path]: false };
			});
		}, 120);
		triggerResetTimers.set(path, timer);
	}

	function coerceIncomingValue(message: OscDecodedMessage): BindingValue | undefined {
		const [firstTag] = message.types;
		const [firstArg] = message.args;
		switch (firstTag) {
			case 'T':
				return true;
			case 'F':
				return false;
			case 'N':
				return true;
			case 'I':
				return null;
			case 'r':
				return normalizeColorValue(firstArg);
			default:
				return (firstArg ?? null) as BindingValue;
		}
	}

	async function refreshStructure() {
		if (!currentEndpoint) return;
		const snapshot = connectionAttempt;
		try {
			const tree = await fetchStructure(currentEndpoint);
			if (snapshot !== connectionAttempt) return;
			structure.set(tree);
			currentNodeIndex = buildNodeIndex(tree);
			const defaults = flatten(tree);
			values.update((prev) => mergeValues(prev, defaults));
			rebuildDesiredSubscriptions();
			syncSubscriptions();
		} catch (error) {
			console.warn('OSCQuery structure refresh failed', error);
		}
	}

	function handleSocketClose() {
		activeSubscriptions.clear();
		if (disconnecting || !streamingEnabled) return;
		if (reconnectHandle) return;
		reconnectHandle = setTimeout(() => {
			reconnectHandle = undefined;
			if (disconnecting || !streamingEnabled) return;
			openWebsocket(lastHostInfo);
		}, 1500);
	}

	function handleSocketError(event: Event) {
		console.warn('OSCQuery websocket error', event);
	}

	function openWebsocket(info: OscHostInfo) {
		if (typeof WebSocket === 'undefined') {
			console.warn('WebSocket API is not available in this environment');
			return;
		}
		const url = resolveWebsocketUrl(info);
		if (!url) {
			console.warn('Unable to determine OSCQuery websocket URL');
			return;
		}
		clearReconnectTimer();
		teardownWebsocket();
		try {
			websocket = new WebSocket(url);
			websocket.binaryType = 'arraybuffer';
			websocket.addEventListener('open', handleSocketOpen);
			websocket.addEventListener('message', handleSocketMessage);
			websocket.addEventListener('close', handleSocketClose);
			websocket.addEventListener('error', handleSocketError);
		} catch (error) {
			console.warn('Failed to open OSCQuery websocket', error);
		}
	}

	function normalizeColorValue(value: BindingValue): string | null {
		if (typeof value !== 'string') return null;
		let hex = value.trim();
		if (!hex) return null;
		if (hex.startsWith('#')) {
			hex = hex.slice(1);
		}
		if (hex.length === 6) {
			return `#${hex.toLowerCase()}`;
		}
		if (hex.length === 8) {
			return `#${hex.slice(0, 6).toLowerCase()}`;
		}
		return null;
	}

	function interpretBoolean(value: BindingValue): boolean {
		if (value === true) return true;
		if (value === false || value === null) return false;
		if (typeof value === 'number') return value !== 0;
		return String(value).toLowerCase() === 'true';
	}

	function buildOscPayload(path: string, value: BindingValue): { types: string; args: BindingValue[] } | null {
		const node = currentNodeIndex.get(path);
		switch (node?.type) {
			case 'boolean': {
				const flag = interpretBoolean(value);
				return { types: flag ? 'T' : 'F', args: [] };
			}
			case 'trigger': {
				const active = interpretBoolean(value);
				if (!active) return null;
				return { types: '', args: [] }; //don't put the N tags, organic ui and other dont support it
			}
			case 'int': {
				const num = Number(value);
				if (!Number.isFinite(num)) return null;
				return { types: 'i', args: [Math.round(num)] };
			}
			case 'float': {
				const num = Number(value);
				if (!Number.isFinite(num)) return null;
				return { types: 'f', args: [num] };
			}
			case 'string': {
				return { types: 's', args: [String(value ?? '')] };
			}
			case 'color': {
				const color = normalizeColorValue(value);
				if (!color) return null;
				return { types: 'r', args: [color] };
			}
		}
		if (typeof value === 'boolean') {
			return { types: value ? 'T' : 'F', args: [] };
		}
		if (typeof value === 'number') {
			return { types: Number.isInteger(value) ? 'i' : 'f', args: [value] };
		}
		if (typeof value === 'string') {
			return { types: 's', args: [value] };
		}
		return null;
	}

	function sendFallbackOsc(path: string, value: BindingValue) {
		if (!currentEndpoint) return;
		fetch(`${currentEndpoint}/osc`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ path, value })
		}).catch((error) => console.warn('OSC fallback send failed', error));
	}

	function disconnect(keepStatus = false) {
		disconnecting = true;
		stopMockUpdates();
		clearReconnectTimer();
		clearTriggerTimers();
		streamingEnabled = false;
		pendingFrames = [];
		activeSubscriptions.clear();
		desiredSubscriptions.clear();
		teardownWebsocket();
		if (!keepStatus) {
			currentEndpoint = '';
			status.set('disconnected');
		}
	}

	async function connect(endpoint: string) {
		const normalized = normalizeEndpoint(endpoint || '');
		disconnect(true);
		connectionAttempt += 1;
		const attemptId = connectionAttempt;
		disconnecting = false;
		status.set('connecting');
		currentEndpoint = normalized;
		try {
			stopMockUpdates();
			const info = await fetchHostInfo(normalized);
			if (attemptId !== connectionAttempt) return;
			lastHostInfo = info;
			hostInfo.set(info);
			const tree = await fetchStructure(normalized);
			if (attemptId !== connectionAttempt) return;
			structure.set(tree);
			currentNodeIndex = buildNodeIndex(tree);
			const defaults = flatten(tree);
			values.update((prev) => mergeValues(prev, defaults));
			rebuildDesiredSubscriptions();
			for (const path of userSubscriptions) {
				ensureValueSnapshot(path);
			}
			streamingEnabled = supportsStreaming(info);
			status.set('connected');
			if (streamingEnabled) {
				openWebsocket(info);
				syncSubscriptions();
			} else {
				console.warn('OSCQuery server does not advertise LISTEN support; updates will not stream');
			}
		} catch (error) {
			console.warn('OSCQuery connection failed, falling back to mock data', error);
			if (attemptId !== connectionAttempt) return;
			useMockData();
		}
	}

	function setValue(path: string, value: BindingValue) {
		values.update((prev) => ({ ...prev, [path]: value }));
		const payload = buildOscPayload(path, value);
		if (payload && streamingEnabled) {
			try {
				const frame = encodeOscMessage(path, payload.types, payload.args);
				enqueueFrame(frame);
				return;
			} catch (error) {
				console.warn('Failed to encode OSC value', error);
			}
		}
		sendFallbackOsc(path, value);
	}

	function setSubscriptions(paths: Iterable<string>) {
		const next = new Set<string>();
		for (const raw of paths) {
			if (!raw) continue;
			next.add(normalizePath(raw));
		}
		userSubscriptions = next;
		rebuildDesiredSubscriptions();
		syncSubscriptions();
	}

	function ensureValueSnapshot(path: string) {
		if (!currentEndpoint) return;
		if (pendingValueFetches.has(path)) return;
		// If we already have a value entry for this path (from the structure defaults
		// or previous updates) there's no need to fetch ?VALUE for it.
		const currentValues = get(values);
		if (Object.prototype.hasOwnProperty.call(currentValues, path)) return;
		const task = fetchNodeValue(path).finally(() => pendingValueFetches.delete(path));
		pendingValueFetches.set(path, task);
	}

	async function fetchNodeValue(path: string) {
		if (!currentEndpoint) return;
		try {
			const response = await requestJson<ValueResponse>(`${currentEndpoint}${path}?VALUE`);
			if (!response || typeof response !== 'object') {
				console.warn('OSCQuery value fetch returned invalid response', path, response);
				return;
			}
			const value = Array.isArray(response.VALUE) ? response.VALUE[0] : undefined;
			if (value === undefined) return;
			values.update((prev) => {
				if (prev[path] === value) return prev;
				return { ...prev, [path]: (value ?? null) as BindingValue };
			});
		} catch (error) {
			console.warn('OSCQuery value fetch failed', path, error);
		}
	}

	return {
		status: { subscribe: status.subscribe },
		structure: { subscribe: structure.subscribe },
		hostInfo: { subscribe: hostInfo.subscribe },
		values: { subscribe: values.subscribe },
		connect,
		disconnect: () => disconnect(),
		setValue,
		setSubscriptions
	};
}

export type OscClient = ReturnType<typeof createOscClient>;
