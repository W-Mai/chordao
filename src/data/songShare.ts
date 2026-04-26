import type { SongSheet } from './songSheet';
import { serializeSongSheet, parseSongSheetText } from './songSheetText';

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function runStream(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  // The DOM lib's writer.write types require an ArrayBuffer-backed Uint8Array,
  // but TS widens our Uint8Array to ArrayBufferLike. Runtime is fine.
  writer.write(bytes as unknown as BufferSource);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

export async function encodeSheetForUrl(sheet: SongSheet): Promise<string> {
  const text = serializeSongSheet(sheet);
  const compressed = await runStream(new TextEncoder().encode(text), new CompressionStream('deflate-raw'));
  return bytesToBase64Url(compressed);
}

export async function decodeSheetFromUrl(payload: string): Promise<SongSheet | null> {
  try {
    const raw = await runStream(base64UrlToBytes(payload), new DecompressionStream('deflate-raw'));
    const text = new TextDecoder().decode(raw);
    const { sheet } = parseSongSheetText(text);
    return sheet;
  } catch {
    return null;
  }
}
