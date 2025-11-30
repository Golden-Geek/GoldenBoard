import type { BindingValue } from '$lib/types/binding';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type OscDecodedMessage = {
	address: string;
	types: string;
	args: BindingValue[];
};

function alignOffset(offset: number): number {
	return (offset + 3) & ~3;
}

function readOscString(view: DataView, offset: number): { value: string; nextOffset: number } | null {
	let cursor = offset;
	while (cursor < view.byteLength && view.getUint8(cursor) !== 0) {
		cursor += 1;
	}
	if (cursor >= view.byteLength) {
		return null;
	}
	const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, cursor - offset);
	const value = decoder.decode(bytes);
	const nextOffset = alignOffset(cursor + 1);
	return { value, nextOffset };
}

function writeOscString(value: string): Uint8Array {
	const source = encoder.encode(value);
	const totalLength = alignOffset(source.length + 1);
	const buffer = new Uint8Array(totalLength);
	buffer.set(source);
	return buffer;
}

function readColor(view: DataView, offset: number): { value: string; nextOffset: number } {
	const rgba = view.getUint32(offset);
	const hex = rgba.toString(16).padStart(8, '0');
	return { value: `#${hex.toUpperCase()}`, nextOffset: offset + 4 };
}

function writeColor(value: string): Uint8Array {
	let hex = value.trim();
	if (hex.startsWith('#')) {
		hex = hex.slice(1);
	}
	if (hex.length === 6) {
		hex = `${hex}FF`;
	}
	const parsed = Number.parseInt(hex.slice(0, 8), 16) >>> 0;
	const buffer = new ArrayBuffer(4);
	const view = new DataView(buffer);
	view.setUint32(0, parsed);
	return new Uint8Array(buffer);
}

function writeInt32(value: number): Uint8Array {
	const buffer = new ArrayBuffer(4);
	new DataView(buffer).setInt32(0, value);
	return new Uint8Array(buffer);
}

function writeFloat32(value: number): Uint8Array {
	const buffer = new ArrayBuffer(4);
	new DataView(buffer).setFloat32(0, value);
	return new Uint8Array(buffer);
}

function writeFloat64(value: number): Uint8Array {
	const buffer = new ArrayBuffer(8);
	new DataView(buffer).setFloat64(0, value);
	return new Uint8Array(buffer);
}

function writeBigInt64(value: number | bigint): Uint8Array {
	const buffer = new ArrayBuffer(8);
	const view = new DataView(buffer);
	const bigintValue = typeof value === 'bigint' ? value : BigInt(Math.trunc(value));
	view.setBigInt64(0, bigintValue);
	return new Uint8Array(buffer);
}

function readBigInt64(view: DataView, offset: number): { value: number; nextOffset: number } {
	const raw = view.getBigInt64(offset);
	return { value: Number(raw), nextOffset: offset + 8 };
}

function readFloat64(view: DataView, offset: number): { value: number; nextOffset: number } {
	return { value: view.getFloat64(offset), nextOffset: offset + 8 };
}

function readFloat32(view: DataView, offset: number): { value: number; nextOffset: number } {
	return { value: view.getFloat32(offset), nextOffset: offset + 4 };
}

function readInt32(view: DataView, offset: number): { value: number; nextOffset: number } {
	return { value: view.getInt32(offset), nextOffset: offset + 4 };
}

export function decodeOscPacket(buffer: ArrayBuffer): OscDecodedMessage | null {
	const view = new DataView(buffer);
	let offset = 0;
	const addressResult = readOscString(view, offset);
	if (!addressResult) {
		return null;
	}
	const { value: address, nextOffset: typeOffset } = addressResult;
	const typeResult = readOscString(view, typeOffset);
	if (!typeResult || !typeResult.value.startsWith(',')) {
		return null;
	}
	let { value: typeTags, nextOffset: argsOffset } = typeResult;
	typeTags = typeTags.slice(1);
	const args: BindingValue[] = [];
	for (const tag of typeTags) {
		switch (tag) {
			case 'i': {
				const { value, nextOffset } = readInt32(view, argsOffset);
				args.push(value);
				argsOffset = nextOffset;
				break;
			}
			case 'f': {
				const { value, nextOffset } = readFloat32(view, argsOffset);
				args.push(value);
				argsOffset = nextOffset;
				break;
			}
			case 's':
			case 'S': {
				const result = readOscString(view, argsOffset);
				if (!result) return null;
				args.push(result.value);
				argsOffset = result.nextOffset;
				break;
			}
			case 'r': {
				const { value, nextOffset } = readColor(view, argsOffset);
				args.push(value);
				argsOffset = nextOffset;
				break;
			}
			case 'h':
			case 't': {
				const { value, nextOffset } = readBigInt64(view, argsOffset);
				args.push(value);
				argsOffset = nextOffset;
				break;
			}
			case 'd': {
				const { value, nextOffset } = readFloat64(view, argsOffset);
				args.push(value);
				argsOffset = nextOffset;
				break;
			}
			case 'T':
				args.push(true);
				break;
			case 'F':
				args.push(false);
				break;
			case 'N':
				args.push(true);
				break;
			case 'I':
				args.push(null);
				break;
			case 'b':
				args.push(null);
				break;
			case 'c':
				args.push(null);
				break;
			default:
				return null;
		}
	}
	return { address, types: typeTags, args };
}

function appendChunks(chunks: Uint8Array[]): Uint8Array {
	const total = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
	const buffer = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		buffer.set(chunk, offset);
		offset += chunk.length;
	}
	return buffer;
}

export function encodeOscMessage(address: string, typeTags: string, args: BindingValue[]): ArrayBuffer {
	const safeAddress = address || '/';
	const chunks: Uint8Array[] = [writeOscString(safeAddress), writeOscString(`,${typeTags}`)];
	let argIndex = 0;
	for (const tag of typeTags) {
		switch (tag) {
			case 'i': {
				const value = Number(args[argIndex++] ?? 0);
				chunks.push(writeInt32(Math.trunc(value)));
				break;
			}
			case 'f': {
				const value = Number(args[argIndex++] ?? 0);
				chunks.push(writeFloat32(value));
				break;
			}
			case 'd': {
				const value = Number(args[argIndex++] ?? 0);
				chunks.push(writeFloat64(value));
				break;
			}
			case 'h':
			case 't': {
				const value = args[argIndex++] ?? 0;
				chunks.push(writeBigInt64(typeof value === 'bigint' ? value : Number(value) || 0));
				break;
			}
			case 's':
			case 'S': {
				const value = String(args[argIndex++] ?? '');
				chunks.push(writeOscString(value));
				break;
			}
			case 'r': {
				const value = String(args[argIndex++] ?? '#000000');
				chunks.push(writeColor(value));
				break;
			}
			case 'b':
				throw new Error('OSC blob arguments are not supported');
			case 'c':
				throw new Error('OSC char arguments are not supported');
			case 'T':
			case 'F':
			case 'N':
			case 'I':
				break;
			default:
				throw new Error(`Unsupported OSC type tag: ${tag}`);
		}
	}
	const merged = appendChunks(chunks);
	return merged.buffer as ArrayBuffer;
}
