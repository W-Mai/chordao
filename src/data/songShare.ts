import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { SongSheet } from './songSheet';
import { serializeSongSheet, parseSongSheetText } from './songSheetText';

/**
 * Pack a sheet into a URL-safe compressed payload.
 * We compress the *canonical text* (not JSON) because text is already terse
 * and the parser tolerates re-entry, so we get good compression + round-trip safety.
 */
export function encodeSheetForUrl(sheet: SongSheet): string {
  const text = serializeSongSheet(sheet);
  return compressToEncodedURIComponent(text);
}

export function decodeSheetFromUrl(payload: string): SongSheet | null {
  const text = decompressFromEncodedURIComponent(payload);
  if (!text) return null;
  const { sheet } = parseSongSheetText(text);
  return sheet;
}
