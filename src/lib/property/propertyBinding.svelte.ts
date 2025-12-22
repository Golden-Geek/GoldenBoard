import { mainState } from '$lib/engine/engine.svelte';
import { activeUserIDs, sanitizeUserID } from './inspectable.svelte';
import { ColorUtil, type Color } from './Color.svelte';
import { Property, PropertyType, type PropertyValueType } from './property.svelte';

type OscSelector = 'default' | 'user';

type OscTarget = {
	selector: OscSelector;
	userID: string | null;
	address: string;
};

type OscQueryLikeServer = {
	structureReady?: boolean;
	addressMap?: Record<string, { node: any; listeners: any[] }>;
	getNode?: (address: string) => any;
	addNodeListener?: (address: string, callback: (e: any) => void) => void;
	removeNodeListener?: (address: string, callback: (e: any) => void) => void;
	sendOSCPacket?: (address: string, args: any[]) => void;
	setValueAndNotify?: (nMap: any, value: any, exclude?: any) => void;
};

function parseOscPath(path: string): OscTarget {
	let serverID = '';
	let address = path.trim();

	// Support: 'server:/path/to/node'
	const match = /^([^:]+):(\/.*)$/.exec(address);
	if (match) {
		serverID = sanitizeUserID(match[1]);
		address = match[2];
	}

	if (!address.startsWith('/')) {
		address = '/' + address;
	}

	if (serverID) {
		return { selector: 'user', userID: serverID, address };
	}
	return { selector: 'default', userID: null, address };
}

function resolveOscServer(target: OscTarget): OscQueryLikeServer | null {
	if (target.selector === 'user') {
		if (!target.userID) return null;
		return (activeUserIDs as any)[target.userID] ?? null;
	}
	return (mainState as any).servers?.at?.(0) ?? null;
}

function isSameValue(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
		return true;
	}
	if (a && b && typeof a === 'object' && typeof b === 'object') {
		const maybeColorA = a as any;
		const maybeColorB = b as any;
		if ('r' in maybeColorA && 'g' in maybeColorA && 'b' in maybeColorA && 'a' in maybeColorA) {
			return ColorUtil.equals(maybeColorA as Color, maybeColorB as Color);
		}
	}
	return false;
}

function oscArgsToScalarOrArray(value: any): unknown {
	// OSCQuery stores VALUE as args array.
	if (Array.isArray(value)) {
		if (value.length === 0) return undefined;
		if (value.length === 1) return value[0];
		return value;
	}
	return value;
}

function coerceToPropertyType(raw: unknown, type: PropertyType): PropertyValueType {
	switch (type) {
		case PropertyType.INTEGER:
			return Number.parseInt(String(raw));
		case PropertyType.FLOAT:
			return Number.parseFloat(String(raw));
		case PropertyType.BOOLEAN:
			return Boolean(raw);
		case PropertyType.STRING:
		case PropertyType.TEXT:
			return String(raw);
		case PropertyType.COLOR:
			return ColorUtil.fromAny(raw) as Color;
		case PropertyType.POINT2D:
		case PropertyType.POINT3D:
			return Array.isArray(raw) ? raw.map((v) => Number(v)) : [Number(raw)];
		default:
			return raw as any;
	}
}

function propertyValueToOscArgs(value: PropertyValueType): any[] {
	if (value == null) return [];
	if (Array.isArray(value)) return value;
	if (typeof value === 'object' && value && 'r' in value && 'g' in value && 'b' in value && 'a' in value) {
		return ColorUtil.toArray(value as Color);
	}
	return [value];
}

/**
 * Binds a Property's raw value to an OSCQuery node VALUE bidirectionally.
 *
 * - Incoming: node VALUE updates -> property.setRaw(...)
 * - Outgoing: property raw updates -> server.sendOSCPacket(...) + local node update
 *
 * Target is dynamically settable via osc()-style path strings:
 * - '/path/to/node' (default server)
 * - 'serverId:/path/to/node' (user server)
 */
export class PropertyBinding {
	readonly property: Property;

	private _targetPath: string | null = $state(null);
	private _target: OscTarget | null = null;
	private _server: OscQueryLikeServer | null = null;
	private _address: string | null = null;

	private _oscListener: ((e: any) => void) | null = null;
	private _destroy: (() => void) | null = null;

	private _suppressPropertyToOsc = false;
	private _suppressOscToProperty = false;

	private _lastPushedPropertyValue: PropertyValueType | null = null;
	private _lastAppliedOscValue: unknown = null;

	constructor(property: Property) {
		this.property = property;

		this._destroy = $effect.root(() => {
			$effect(() => {
				const targetPath = this._targetPath;
				if (!targetPath) {
					this.rebind(null);
					return;
				}

				// Make server lifecycle + node existence reactive dependencies.
				// This allows calling setTarget() before the OSCQuery structure is ready.
				try {
					const target = parseOscPath(targetPath);
					const server = resolveOscServer(target);
					const _ready = !!server?.structureReady;
					const _node = _ready ? server?.addressMap?.[target.address] : null;
					void _node;
				} catch {
					// ignore
				}

				this.rebind(targetPath);
			});

			$effect(() => {
				// Push property -> OSC
				const targetPath = this._targetPath;
				if (!targetPath) return;
				const server = this._server;
				const address = this._address;
				if (!server || !address) return;

				// Access property reactive state
				const nextValue = this.property.value;
				if (this._suppressPropertyToOsc) return;
				if (this._lastPushedPropertyValue != null && isSameValue(this._lastPushedPropertyValue, nextValue)) return;

				const args = propertyValueToOscArgs(nextValue);
				if (args.length === 0) return;

				try {
					// Update local node state immediately (and notify other listeners).
					const nMap = server.addressMap?.[address];
					if (nMap && typeof server.setValueAndNotify === 'function') {
						server.setValueAndNotify(nMap, args, this._oscListener);
					}
					server.sendOSCPacket?.(address, args);
					this._lastPushedPropertyValue = Array.isArray(nextValue)
						? ([...nextValue] as any)
						: (typeof nextValue === 'object' && nextValue ? ({ ...(nextValue as any) } as any) : nextValue);
				} catch {
					// ignore send errors
				}
			});

			return () => {
				this.unbindListener();
			};
		});
	}

	setTarget(path: string | null | undefined) {
		this._targetPath = path ? path.trim() : null;
	}

	get target(): string | null {
		return this._targetPath;
	}

	cleanup() {
		this.unbindListener();
		this._destroy?.();
		this._destroy = null;
	}

	private rebind(path: string | null) {
		if (!path) {
			this._target = null;
			this._server = null;
			this._address = null;
			this.unbindListener();
			return;
		}

		let target: OscTarget;
		try {
			target = parseOscPath(path);
		} catch {
			return;
		}

		const server = resolveOscServer(target);
		const address = target.address;

		// If changed, detach old listener.
		const same =
			this._target &&
			this._target.selector === target.selector &&
			this._target.userID === target.userID &&
			this._target.address === target.address &&
			this._server === server;

		this._target = target;
		this._server = server;
		this._address = address;

		if (!same) {
			this.unbindListener();
			this._lastAppliedOscValue = null;
			this._lastPushedPropertyValue = null;
		}

		if (!server) return;
		if (!server.structureReady) return;

		// Only bind if node exists.
		if (!server.addressMap || !server.addressMap[address]) return;

		this.bindListener(server, address);
		this.applyFromNode(server, address);
	}

	private bindListener(server: OscQueryLikeServer, address: string) {
		if (this._oscListener) return;
		const cb = (e: any) => {
			if (!e || e.event !== 'valueChanged') return;
			this.applyFromOscArgs(e.value);
		};
		this._oscListener = cb;
		server.addNodeListener?.(address, cb);
	}

	private unbindListener() {
		const server = this._server;
		const address = this._address;
		const cb = this._oscListener;
		if (server && address && cb) {
			try {
				server.removeNodeListener?.(address, cb);
			} catch {
				// ignore
			}
		}
		this._oscListener = null;
	}

	private applyFromNode(server: OscQueryLikeServer, address: string) {
		const node = server.getNode?.(address);
		if (!node) return;
		this.applyFromOscArgs((node as any).VALUE);
	}

	private applyFromOscArgs(argsValue: any) {
		if (this._suppressOscToProperty) return;

		const scalarOrArray = oscArgsToScalarOrArray(argsValue);
		if (scalarOrArray === undefined) return;
		if (isSameValue(this._lastAppliedOscValue, scalarOrArray)) return;

		const def = this.property.getDefinition();
		let filtered: unknown = scalarOrArray;
		if (def.filterFunction) {
			try {
				filtered = def.filterFunction(filtered);
			} catch {
				// ignore filter errors
			}
		}

		const coerced = coerceToPropertyType(filtered, def.type);

		this._suppressPropertyToOsc = true;
		try {
			this.property.setRaw(coerced);
			this._lastAppliedOscValue = Array.isArray(scalarOrArray) ? [...scalarOrArray] : scalarOrArray;
		} finally {
			this._suppressPropertyToOsc = false;
		}
	}
}
