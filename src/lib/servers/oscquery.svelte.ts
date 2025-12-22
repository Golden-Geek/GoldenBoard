import { mainState, saveData } from '$lib/engine/engine.svelte.js';
import { InspectableWithProps, sanitizeUserID } from "../property/inspectable.svelte.ts";
import { Property, PropertyType, type PropertyContainerDefinition, type PropertySingleDefinition } from '$lib/property/property.svelte.js';
import type { OscPacket } from './osc.js';
import { decodeOscPacket, encodeOscPacket } from './osc.js';
import { ColorUtil } from '$lib/property/Color.svelte.ts';

export enum ConnectionStatus {
	Disconnected = "disconnected",
	Connecting = "connecting",
	Connected = "connected"
}

export class OSCQueryClient extends InspectableWithProps {

	name = $derived((this.getSingleProp('name').get() as string));


	ip = $derived((this.getSingleProp('ip').get() as string));
	port = $derived((this.getSingleProp('port').get() as number));


	useFixedRateSending = $derived(
		(this.getProp('advanced.useFixedRateSending') as Property | null)?.get() as boolean
	);
	fixedSendRateHz = $derived(
		(this.getProp('advanced.fixedSendRateHz') as Property | null)?.get() as number
	);

	isSelected: boolean = $derived(mainState.selectedServer == this);

	//Connection
	ws: WebSocket | null = null;
	id: string = crypto.randomUUID();
	status: ConnectionStatus = $state(ConnectionStatus.Disconnected);
	reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

	//Data
	structureReady: boolean = $state(false);
	data: any = $state({});
	addressMap: any = $state({} as { [key: string]: { node: any; listeners: any[] } });
	activeListenedNodes = $derived(
		Object.values(this.addressMap).filter((nodeInfo) => (nodeInfo as any).listeners.length > 0)
	);

	private outboundConflater: Map<string, { address: string, args: any[] }> = new Map();
	private outboundTimer: number | null = null;

	pendingMessages: string[] = [];

	constructor() {
		super("server");
		this.setupProps();
		this.ws = null;
		this.connect();
	}
	

	cleanup() {
		super.cleanup();
		this.disconnect();
		this.ws = null;
	}

	getPropertyDefinitions(): { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition); } | null {
		return { ...super.getPropertyDefinitions(), ...serverPropertyDefinitions };
	}

	override getAutoID(): string {
		return sanitizeUserID(this.name.split(' - ')[0]) as string
	}

	//WS Connection 
	connect(): void {
		this.disconnect();
		this.setStatus(ConnectionStatus.Connecting);

		// console.log(`[${this.name}] Connecting to: ${this.ip} : ${this.port}...`);
		try {
			this.ws = new WebSocket("ws://" + this.ip + ":" + this.port);
			this.ws.binaryType = 'arraybuffer';
			this.ws.onopen = (e: any) => {
				this.setStatus(ConnectionStatus.Connected);
				this.flushPendingMessages();
				this.startOutboundPump();
				this.flushOutboundBundle();
			};
			this.ws.onclose = (e: any) => {
				this.setStatus(ConnectionStatus.Disconnected);
			};
			this.ws.onerror = (e: any) => {
				if (this.ws && this.status == ConnectionStatus.Connecting &&
					this.ws.readyState !== WebSocket.OPEN && this.ws.readyState !== WebSocket.CONNECTING) {
					this.setStatus(ConnectionStatus.Disconnected);

					this.reconnectTimeout = setTimeout(() => {
						if (this.status === ConnectionStatus.Disconnected) {
							this.connect();
						}
					}, 1000);
				}

			};
			this.ws.onmessage = (e: MessageEvent) => this.wsMessageReceived(e);
		} catch (e) {
			console.error("Error connecting to: " + this.ip + ":" + this.port);
		}

		// this.ws.on('ready', () => { this.ws.socket.onmessage = (e: any) => this.wsMessageReceived(e); });

	}

	disconnect(): void {

		if (this.status === ConnectionStatus.Disconnected) return;
		if (!this.ws) return;

		clearTimeout(this.reconnectTimeout!);
		this.reconnectTimeout = null;

		this.stopOutboundPump();
		this.ws.onerror = null;

		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.close();
		}
		this.setStatus(ConnectionStatus.Disconnected);

	}

	setStatus(status: ConnectionStatus): void {
		if (this.status === status) return;

		this.status = status;
		switch (this.status) {

			case ConnectionStatus.Connecting:
				break;

			case ConnectionStatus.Connected:
				clearTimeout(this.reconnectTimeout!);
				this.reconnectTimeout = null;
				this.requestStructure();
				break;

			case ConnectionStatus.Disconnected:
				this.stopOutboundPump();
				this.getSingleProp('name').set(this.ip + ' - ' + this.port);
				break;
		}
	}

	wsConnectionStatusChanged(e: any): void {
		switch (e.type) {
			case 'open':
				this.setStatus(ConnectionStatus.Connected);
				break;

			case 'connecting':
				this.setStatus(ConnectionStatus.Connecting);
				break;

			case 'close':
				this.setStatus(ConnectionStatus.Disconnected);
				break;
		}
	}

	setIPAndPort(ip: string, port: number, save: boolean = true): void {
		if (this.ip === ip && this.port === port) return;
		this.getSingleProp('ip').set(ip);
		this.getSingleProp('port').set(port);
		if (save) {
			saveData("Update Server " + this.name);
		}
		this.connect();
	}

	applySnapshot(data: any) {
		super.applySnapshot(data);
		this.connect();
	}

	//OSCQuery structure

	requestStructure() {
		fetch("http://" + this.ip + ":" + this.port + '/')
			.then((response) => {
				return response.json();
			})
			.then((json) => {
				this.parseStructure(json);
				this.requestHostInfo();
			});
	}

	requestHostInfo() {
		var hostInfoUrl = "http://" + this.ip + ":" + this.port + '/?HOST_INFO';
		// console.log("Requesting Host Info: ", hostInfoUrl);
		fetch(hostInfoUrl)
			.then(function (response) {
				return response.json();
			})
			.then((json) => {
				this.parseHostInfo(json);
			})
			.catch((err) => {
				console.warn("Error fetching host info: ", err);
			});
	}

	sendNodeValue(nMap: any, rawValue: any) {
		const address = nMap.node.FULL_PATH;
		const typeTag = nMap.node.TYPE;
		let args: any[] = [];
		if (typeTag === 'T') {
			args = [true];
		} else if (typeTag === 'F') {
			args = [false];
		} else if (Array.isArray(rawValue)) {
			args = rawValue;
		} else if (typeTag == 'r') {
			args = [ColorUtil.toHex(ColorUtil.fromAny(rawValue))];
		} else {
			args = [rawValue];
		}
	}

	sendOSCPacket(address: string, args: any[]) {
		if (this.useFixedRateSending) {
			this.outboundConflater.set(address, { address, args });
			return;
		}
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
		const packet = { address, args };
		const buf = encodeOscPacket(packet as any);
		this.ws.send(buf);
	}

	sendWebsocketMessage(msg: string) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			this.pendingMessages.push(msg);
			return;
		}
		this.ws.send(msg);
	}

	private flushPendingMessages() {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
		while (this.pendingMessages.length > 0) {
			const msg = this.pendingMessages.shift();
			if (msg == null) break;
			this.ws.send(msg);
		}
	}

	sendOSCQueryWebsocketCommand(msg: any) {
		let textMsg = msg;
		if (typeof msg !== 'string') textMsg = JSON.stringify(msg);
		this.sendWebsocketMessage(textMsg);
	}

	wsMessageReceived(e: MessageEvent): void {
		// console.log("Message received: ", e.data);
		if (typeof e.data === 'string') {
			let msg: any = null;
			try {
				msg = JSON.parse(e.data);
				if (msg) {
					if (!this.processCommandMessage(msg)) {
						console.log('Unexpected non-command message: ' + e.data);
					}
					return;
				}
			} catch (e) {
				// not JSON
			}
			return;
		}

		if (e.data instanceof ArrayBuffer) {
			this.processOSCMessage(e.data);
			return;
		}

		// Some servers may send Blob
		if (typeof Blob !== 'undefined' && e.data instanceof Blob) {
			void e.data.arrayBuffer().then((buf) => this.processOSCMessage(buf));
		}
	}

	parseStructure(json: any): void {
		this.data.structure = json;
		this.buildAddressMap();
		this.structureReady = true;
	}

	parseHostInfo(json: any): void {
		this.data.hostInfo = json;
		this.getSingleProp('name').set(this.data.hostInfo.NAME);

	}

	buildAddressMap(node?: any): void {
		if (!node) {
			node = this.getRoot();
			this.addressMap = {};
		}

		if (node.FULL_PATH) {
			this.addressMap[node.FULL_PATH] = { node: node, listeners: [] };
		}
		if (node.CONTENTS) {
			for (let i in node.CONTENTS) this.buildAddressMap(node.CONTENTS[i]);
		}
	}

	processCommandMessage(msg: any): boolean {
		console.log("Processing command message: ", msg);

		//TODO : be more selective about what to do on these messages with partial structure update
		if (msg.COMMAND === 'PATH_ADDED') {
			this.requestStructure();
		} else if (msg.COMMAND === 'PATH_REMOVED') {
			this.requestStructure();
		} else if (msg.COMMAND === 'PATH_CHANGED') {
			this.requestStructure();
		} else if (msg.COMMAND == "PATH_RENAMED") {
			this.requestStructure();
		} else {
			console.warn("Unknown command message: ", msg);
		}

		return false;
	}

	processOSCMessage(msg: ArrayBuffer): void {
		const packet = decodeOscPacket(msg, { metadata: false }) as OscPacket;
		if (!packet || typeof packet !== 'object') return;

		const applyMessage = (p: any) => {
			if (!p || typeof p !== 'object' || typeof p.address !== 'string') return;
			const address = p.address;
			const args = Array.isArray(p.args) ? p.args : [];

			const nMap = this.addressMap[address];
			if (!nMap) {
				console.warn("Got update from OSCQuery but address not found: " + address);
				return;
			}

			this.setValueAndNotify(nMap, args);
		};

		const walk = (p: any) => {
			if (!p || typeof p !== 'object') return;
			if (Array.isArray(p.packets)) {
				for (const child of p.packets) walk(child);
				return;
			}
			applyMessage(p);
		};

		walk(packet);
	}



	//Listeners
	addNodeListener(address: string, callback: any): void {
		if (!this.addressMap[address]) {
			console.warn("Address not found : " + address);
			return
		}
		if (this.addressMap[address].listeners.length == 0) {
			console.log("First listener, sending LISTEN for " + address);
			this.sendOSCQueryWebsocketCommand({
				COMMAND: 'LISTEN',
				DATA: address
			});
		}
		this.addressMap[address].listeners.push(callback);
	}

	removeNodeListener(address: string, callback: any): void {
		if (!this.addressMap[address]) {
			console.warn("Address not found : " + address);
			return
		}
		let index = this.addressMap[address].listeners.indexOf(callback);

		if (index > -1) {
			this.addressMap[address].listeners.splice(index, 1);
		} else {
			console.warn("Listener not found for " + address);
		}

		if (this.addressMap[address].listeners.length == 0) {
			console.log("No more listeners, sending IGNORE for " + address);
			this.sendOSCQueryWebsocketCommand({
				COMMAND: 'IGNORE',
				DATA: address
			});
		}
	}

	//Fixed rate sending
	private startOutboundPump() {
		if (!this.useFixedRateSending) return;
		if (this.outboundTimer != null) return;
		const hz = Number(this.fixedSendRateHz);
		const clampedHz = Number.isFinite(hz) && hz > 0 ? hz : 60;
		const intervalMs = Math.max(1, Math.round(1000 / clampedHz));
		this.outboundTimer = window.setInterval(() => {
			this.flushOutboundBundle();
		}, intervalMs);
	}

	private stopOutboundPump() {
		if (this.outboundTimer == null) return;
		window.clearInterval(this.outboundTimer);
		this.outboundTimer = null;
	}

	private flushOutboundBundle() {
		if (!this.useFixedRateSending) return;
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
		if (this.outboundConflater.size === 0) return;

		// Conflated: only latest per address
		const packets = Array.from(this.outboundConflater.values())
			.sort((a, b) => a.address.localeCompare(b.address))
			.map((m) => ({ address: m.address, args: m.args }));

		this.outboundConflater.clear();
		const bundle = { timeTag: 1n, packets };
		const buf = encodeOscPacket(bundle as any);
		this.ws.send(buf);
	}

	setFixedRateSending(enabled: boolean, rateHz?: number) {
		(this.getProp('advanced.useFixedRateSending') as Property | null)?.setRaw(enabled);
		if (rateHz != null) (this.getProp('advanced.fixedSendRateHz') as Property | null)?.setRaw(rateHz);
		if (this.useFixedRateSending) {
			this.startOutboundPump();
		} else {
			this.stopOutboundPump();
			this.outboundConflater.clear();
		}
	}

	//Structure methods
	getRoot() {
		return this.data.structure
	}

	getNode(address: string): any {
		let nMap = this.addressMap[address];
		if (!nMap) {
			console.warn("Node not found: " + address);
			return null;
		}
		return nMap.node;
	}

	getChildNode(node: any, relativeAddress: string): any {
		return this.getNode(node.FULL_PATH + "/" + relativeAddress);
	}

	setValueAndNotify(nMap: any, value: any, exclude?: any): void {
		if (nMap.node.TYPE == "T" || nMap.node.TYPE == "F") {
			nMap.node.TYPE = value[0] ? "T" : "F";
		}

		nMap.node.VALUE = value;
		nMap.listeners.forEach((listener: any) => {

			if (listener == exclude) return;
			listener({ event: "valueChanged", value })
		});
	}

	//Helpers
	hasData() {
		return Object.entries(this.getRoot()).length > 0;
	}
}



// OSCQuery Clients management

let servers = $derived(mainState.servers);
export const clients: OSCQueryClient[] = $state([]);

export function getServerByID(id: string): OSCQueryClient | null {
	return servers.find((b: OSCQueryClient) => b.id === id) || null;
}

export const addServer = function (): OSCQueryClient {
	const client = new OSCQueryClient();
	servers.push(client);
	mainState.selectedServer = client;
	saveData("Add Server");
	return client;
}

export const removeServer = function (server: OSCQueryClient) {
	let index = servers.indexOf(server);
	if (index > -1) {
		server.disconnect();
		server.cleanup();
		servers.splice(index, 1);
	}

	saveData("Remove Server");
}

export const clearServers = function () {
	while (servers.length > 0) {
		let server = servers.pop();
		server?.disconnect();
		server?.cleanup();
	}
}

export function toServersSnapshot() {
	let data: any[] = [];
	for (let client of servers) {
		data.push(client.toSnapshot());
	}

	return data;
}

export function applyServersSnapshot(data: any[]) {

	if (data == null || data.length === 0) {
		while (servers.length > 0) {
			removeServer(servers[0]);
		}

		addServer();
		return;
	}

	mainState.servers = data.map((sData: any) => {
		let server = servers.find(s => s.id === sData.id);
		if (!server) {
			server = new OSCQueryClient();
		}


		server.applySnapshot(sData);
		return server;
	});
}
//Node type icons

const nodeTypes = [
	{ type: "Container", icon: "📁" },
	{ type: "Boolean", icon: "☑️" },
	{ type: "Integer", icon: "🔢" },
	{ type: "Float", icon: "🔣" },
	{ type: "String", icon: "🔤" },
	{ type: "Color", icon: "🎨" },
	{ type: "Trigger", icon: "⚡" },
	{ type: "Enum", icon: "🎛️" },
	{ type: "Point2D", icon: "📐" },
	{ type: "Point3D", icon: "🧊" },
]

function getNodeType(node: any): string {
	if (node.CONTENTS) return 'Container';
	if (node.EXTENDED_TYPE) return node.EXTENDED_TYPE[0];
	if (!node.CONTENTS && node.TYPE == 'N') return 'Trigger';
	return node.TYPE;
}

export function getNodeIcon(node: any): string {
	const type = getNodeType(node);
	const nodeType = nodeTypes.find(t => t.type === type);
	return nodeType ? nodeType.icon : "❓";
}

const serverPropertyDefinitions: { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) } = {
	name: { name: "name", type: PropertyType.STRING, default: "New Server", readOnly: true },
	ip: { name: "ip", type: PropertyType.STRING, default: "127.0.0.1" },
	port: { name: "port", type: PropertyType.INTEGER, default: 42000 }
};


