export type OscTypeTag =
	| 'i'
	| 'f'
	| 's'
	| 'b'
	| 'r'
	| 'T'
	| 'F'
	| 'N'
	| 'I'
	| 'h'
	| 'd'
	| 't';

export type OscArgMeta = { type: OscTypeTag; value?: unknown };

export type OscRgba = { r: number; g: number; b: number; a: number };
export type OscArg =
	| number
	| string
	| boolean
	| null
	| undefined
	| bigint
	| Uint8Array
	| ArrayBuffer
	| OscRgba
	| OscArgMeta;

export type OscMessage = {
	address: string;
	args?: OscArg[];
};

// OSC timetag is NTP 64-bit: seconds since 1900 + fractional seconds.
// We expose it as a raw bigint by default.
export type OscBundle = {
	timeTag?: bigint;
	packets: OscPacket[];
};

export type OscPacket = OscMessage | OscBundle;

export type OscCodecOptions = {
	// If true, decoded args are returned as `{ type, value }`.
	// If false, decoded args are returned as plain JS values.
	metadata?: boolean;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function pad4(n: number) {
	return (4 - (n % 4)) & 3;
}

function normalizeArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
	if (data instanceof Uint8Array) return data.slice().buffer;
	return data;
}

function readInt32(dv: DataView, o: number) {
	return dv.getInt32(o, false);
}

function writeInt32(dv: DataView, o: number, v: number) {
	dv.setInt32(o, v, false);
}

function readUint32(dv: DataView, o: number) {
	return dv.getUint32(o, false);
}

function writeUint32(dv: DataView, o: number, v: number) {
	dv.setUint32(o, v, false);
}

function readFloat32(dv: DataView, o: number) {
	return dv.getFloat32(o, false);
}

function writeFloat32(dv: DataView, o: number, v: number) {
	dv.setFloat32(o, v, false);
}

function readFloat64(dv: DataView, o: number) {
	return dv.getFloat64(o, false);
}

function writeFloat64(dv: DataView, o: number, v: number) {
	dv.setFloat64(o, v, false);
}

function readBigInt64(dv: DataView, o: number) {
	if (typeof (dv as any).getBigInt64 === 'function') return (dv as any).getBigInt64(o, false) as bigint;
	// lossy fallback
	const hi = dv.getInt32(o, false);
	const lo = dv.getUint32(o + 4, false);
	return (BigInt(hi) << 32n) | BigInt(lo);
}

function writeBigInt64(dv: DataView, o: number, v: bigint) {
	if (typeof (dv as any).setBigInt64 === 'function') {
		(dv as any).setBigInt64(o, v, false);
		return;
	}
	const hi = Number((v >> 32n) & 0xffffffffn);
	const lo = Number(v & 0xffffffffn);
	dv.setInt32(o, hi, false);
	dv.setUint32(o + 4, lo, false);
}

function readOscString(bytes: Uint8Array, start: number) {
	let end = start;
	while (end < bytes.length && bytes[end] !== 0) end++;
	const value = textDecoder.decode(bytes.subarray(start, end));
	end = end + 1; // NUL
	end = end + pad4(end);
	return { value, next: end };
}

function writeOscString(value: string) {
	const encoded = textEncoder.encode(value);
	const total = encoded.length + 1;
	const padded = total + pad4(total);
	const out = new Uint8Array(padded);
	out.set(encoded, 0);
	out[encoded.length] = 0;
	return out;
}

function readOscBlob(bytes: Uint8Array, start: number) {
	const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const len = readInt32(dv, start);
	let o = start + 4;
	const value = bytes.subarray(o, o + len);
	o = o + len;
	o = o + pad4(o);
	return { value, next: o };
}

function writeOscBlob(value: Uint8Array) {
	const len = value.byteLength;
	const total = 4 + len;
	const padded = total + pad4(total);
	const out = new Uint8Array(padded);
	const dv = new DataView(out.buffer);
	writeInt32(dv, 0, len);
	out.set(value, 4);
	return out;
}

// NTP epoch offset (Unix 1970 -> NTP 1900)
const NTP_UNIX_EPOCH_OFFSET_S = 2208988800n;

export function ntpFromUnixMs(unixMs: number): bigint {
	const ms = BigInt(Math.max(0, Math.floor(unixMs)));
	const seconds = ms / 1000n;
	const fracMs = ms % 1000n;
	// fractional is 32-bit fraction of a second
	const fractional = (fracMs * 0x100000000n) / 1000n;
	return ((seconds + NTP_UNIX_EPOCH_OFFSET_S) << 32n) | (fractional & 0xffffffffn);
}

export function unixMsFromNtp(ntp: bigint): number {
	const seconds = (ntp >> 32n) - NTP_UNIX_EPOCH_OFFSET_S;
	const fractional = ntp & 0xffffffffn;
	const ms = seconds * 1000n + (fractional * 1000n) / 0x100000000n;
	return Number(ms);
}

function toMeta(arg: OscArg): OscArgMeta {
	if (arg && typeof arg === 'object' && 'type' in arg && typeof (arg as any).type === 'string') {
		return arg as OscArgMeta;
	}

	// OSC 1.1 RGBA color typetag 'r'
	// We accept an object shaped like { r, g, b, a }.
	if (
		arg &&
		typeof arg === 'object' &&
		'r' in (arg as any) &&
		'g' in (arg as any) &&
		'b' in (arg as any) &&
		'a' in (arg as any) &&
		typeof (arg as any).r === 'number' &&
		typeof (arg as any).g === 'number' &&
		typeof (arg as any).b === 'number' &&
		typeof (arg as any).a === 'number'
	) {
		return { type: 'r', value: arg };
	}

	if (arg === true) return { type: 'T', value: true };
	if (arg === false) return { type: 'F', value: false };
	if (arg === null || arg === undefined) return { type: 'N', value: null };
	if (typeof arg === 'string') return { type: 's', value: arg };
	if (typeof arg === 'number') {
		if (Number.isInteger(arg) && arg >= -2147483648 && arg <= 2147483647) return { type: 'i', value: arg };
		return { type: 'f', value: arg };
	}
	if (typeof arg === 'bigint') return { type: 'h', value: arg };
	if (arg instanceof Uint8Array) return { type: 'b', value: arg };
	if (arg instanceof ArrayBuffer) return { type: 'b', value: new Uint8Array(arg) };
	
	return { type: 's', value: JSON.stringify(arg) };
}

function clamp01(n: number): number {
	if (!Number.isFinite(n)) return 0;
	return Math.min(1, Math.max(0, n));
}

function rgbaToUint32(value: any): number {
	// Accept either:
	// - uint32 already (0xRRGGBBAA)
	// - {r,g,b,a} where channels are either 0..1 floats or 0..255 bytes
	if (typeof value === 'number' && Number.isFinite(value)) {
		return (Math.trunc(value) >>> 0) as number;
	}

	const rIn = Number(value?.r ?? 0);
	const gIn = Number(value?.g ?? 0);
	const bIn = Number(value?.b ?? 0);
	const aIn = Number(value?.a ?? 1);

	const toByte = (c: number, defaultByte: number) => {
		if (!Number.isFinite(c)) return defaultByte;
		// Heuristic: treat <=1 as float, otherwise as byte.
		const v = c <= 1 ? clamp01(c) * 255 : c;
		return Math.min(255, Math.max(0, Math.round(v)));
	};

	const r = toByte(rIn, 0);
	const g = toByte(gIn, 0);
	const b = toByte(bIn, 0);
	const a = toByte(aIn, 255);

	return (((r & 0xff) << 24) | ((g & 0xff) << 16) | ((b & 0xff) << 8) | (a & 0xff)) >>> 0;
}

function concat(parts: Uint8Array[]) {
	let total = 0;
	for (const p of parts) total += p.byteLength;
	const out = new Uint8Array(total);
	let o = 0;
	for (const p of parts) {
		out.set(p, o);
		o += p.byteLength;
	}
	return out;
}

function toBigInt(value: unknown, fallback: bigint) {
	if (typeof value === 'bigint') return value;
	if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value));
	if (typeof value === 'string') {
		try {
			return BigInt(value);
		} catch {
			return fallback;
		}
	}
	return fallback;
}

export function encodeOscMessage(message: OscMessage, options: OscCodecOptions = {}): ArrayBuffer {
	const metas = (message.args ?? []).map(toMeta);
	const typeTag = ',' + metas.map((m) => m.type).join('');
	const parts: Uint8Array[] = [writeOscString(message.address), writeOscString(typeTag)];

	for (const m of metas) {
		switch (m.type) {
			case 'i': {
				const b = new Uint8Array(4);
				writeInt32(new DataView(b.buffer), 0, Number(m.value ?? 0));
				parts.push(b);
				break;
			}
			case 'f': {
				const b = new Uint8Array(4);
				writeFloat32(new DataView(b.buffer), 0, Number(m.value ?? 0));
				parts.push(b);
				break;
			}
			case 's':
				parts.push(writeOscString(String(m.value ?? '')));
				break;
			case 'b': {
				const u8 = m.value instanceof Uint8Array ? m.value : new Uint8Array(m.value as any);
				parts.push(writeOscBlob(u8));
				break;
			}
			case 'r': {
				const b = new Uint8Array(4);
				writeUint32(new DataView(b.buffer), 0, rgbaToUint32(m.value));
				parts.push(b);
				break;
			}
			case 'h': {
				const b = new Uint8Array(8);
				writeBigInt64(new DataView(b.buffer), 0, toBigInt(m.value, 0n));
				parts.push(b);
				break;
			}
			case 'd': {
				const b = new Uint8Array(8);
				writeFloat64(new DataView(b.buffer), 0, Number(m.value ?? 0));
				parts.push(b);
				break;
			}
			case 't': {
				const b = new Uint8Array(8);
				writeBigInt64(new DataView(b.buffer), 0, toBigInt(m.value, 1n));
				parts.push(b);
				break;
			}
			case 'T':
			case 'F':
			case 'N':
			case 'I':
				// no payload
				break;
			default:
				throw new Error(`Unsupported OSC typetag for encode: ${(m as any).type}`);
		}
	}

	return concat(parts).buffer;
}

export function encodeOscBundle(bundle: OscBundle, options: OscCodecOptions = {}): ArrayBuffer {
	const header = writeOscString('#bundle');
	const timeTag = bundle.timeTag ?? 1n;
	const tt = new Uint8Array(8);
	writeBigInt64(new DataView(tt.buffer), 0, BigInt(timeTag));

	const parts: Uint8Array[] = [header, tt];
	for (const p of bundle.packets) {
		const buf = new Uint8Array(encodeOscPacket(p, options));
		const size = new Uint8Array(4);
		writeInt32(new DataView(size.buffer), 0, buf.byteLength);
		parts.push(size, buf);
	}

	return concat(parts).buffer;
}

export function encodeOscPacket(packet: OscPacket, options: OscCodecOptions = {}): ArrayBuffer {
	if (packet && typeof packet === 'object' && 'packets' in packet) {
		return encodeOscBundle(packet as OscBundle, options);
	}
	return encodeOscMessage(packet as OscMessage, options);
}

export function decodeOscPacket(data: ArrayBuffer | Uint8Array, options: OscCodecOptions = {}): OscPacket {
	const buf = normalizeArrayBuffer(data);
	const bytes = new Uint8Array(buf);
	const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const metadata = options.metadata ?? true;

	let o = 0;
	const head = readOscString(bytes, o);
	const first = head.value;
	o = head.next;

	if (first === '#bundle') {
		const timeTag = readBigInt64(dv, o);
		o += 8;
		const packets: OscPacket[] = [];
		while (o < bytes.length) {
			const size = readInt32(dv, o);
			o += 4;
			if (size < 0 || o + size > bytes.length) throw new Error('Invalid OSC bundle element size');
			const slice = bytes.subarray(o, o + size);
			o += size;
			packets.push(decodeOscPacket(slice, options));
		}
		return { timeTag, packets };
	}

	const address = first;
	const tt = readOscString(bytes, o);
	const typetags = tt.value;
	o = tt.next;

	const args: any[] = [];
	for (let i = 0; i < typetags.length; i++) {
		const t = typetags[i];
		if (i === 0 && t === ',') continue;
		switch (t) {
			case 'i': {
				const v = readInt32(dv, o);
				o += 4;
				args.push(metadata ? ({ type: 'i', value: v } satisfies OscArgMeta) : v);
				break;
			}
			case 'f': {
				const v = readFloat32(dv, o);
				o += 4;
				args.push(metadata ? ({ type: 'f', value: v } satisfies OscArgMeta) : v);
				break;
			}
			case 's': {
				const s = readOscString(bytes, o);
				o = s.next;
				args.push(metadata ? ({ type: 's', value: s.value } satisfies OscArgMeta) : s.value);
				break;
			}
			case 'b': {
				const b = readOscBlob(bytes, o);
				o = b.next;
				args.push(metadata ? ({ type: 'b', value: b.value } satisfies OscArgMeta) : b.value);
				break;
			}
			case 'r': {
				const v = readUint32(dv, o);
				o += 4;
				const color = {
					r: ((v >>> 24) & 0xff) / 255,
					g: ((v >>> 16) & 0xff) / 255,
					b: ((v >>> 8) & 0xff) / 255,
					a: (v & 0xff) / 255
				} satisfies OscRgba;
				args.push(metadata ? ({ type: 'r', value: color } satisfies OscArgMeta) : color);
				break;
			}
			case 'h': {
				const v = readBigInt64(dv, o);
				o += 8;
				args.push(metadata ? ({ type: 'h', value: v } satisfies OscArgMeta) : v);
				break;
			}
			case 'd': {
				const v = readFloat64(dv, o);
				o += 8;
				args.push(metadata ? ({ type: 'd', value: v } satisfies OscArgMeta) : v);
				break;
			}
			case 't': {
				const v = readBigInt64(dv, o);
				o += 8;
				args.push(metadata ? ({ type: 't', value: v } satisfies OscArgMeta) : v);
				break;
			}
			case 'T':
				args.push(metadata ? ({ type: 'T', value: true } satisfies OscArgMeta) : true);
				break;
			case 'F':
				args.push(metadata ? ({ type: 'F', value: false } satisfies OscArgMeta) : false);
				break;
			case 'N':
				args.push(metadata ? ({ type: 'N', value: null } satisfies OscArgMeta) : null);
				break;
			case 'I':
				args.push(metadata ? ({ type: 'I', value: null } satisfies OscArgMeta) : null);
				break;
			default:
				throw new Error(`Unsupported OSC typetag for decode: ${t}`);
		}
	}

	return { address, args };
}

