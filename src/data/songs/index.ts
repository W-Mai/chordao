import type { SongSheet } from '../songSheet';
import { parseSongSheetText } from '../songSheetText';

// Eagerly load every .md file under /songs at build time as raw text.
// Users can drop new .md files into the songs/ folder to add songs.
const rawFiles = import.meta.glob('/songs/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function slugFromPath(path: string): string {
  const name = path.split('/').pop() ?? '';
  return name.replace(/\.md$/, '');
}

function loadBuiltin(): SongSheet[] {
  const sheets: SongSheet[] = [];
  for (const [path, raw] of Object.entries(rawFiles)) {
    const id = slugFromPath(path);
    const { sheet, errors } = parseSongSheetText(raw);
    if (!sheet) {
      console.warn(`[songs] skipped ${path}: ${errors.map((e) => e.message).join('; ')}`);
      continue;
    }
    // Override id with filename so the URL stays stable across title edits
    sheets.push({ ...sheet, id });
  }
  return sheets.sort((a, b) => a.title.localeCompare(b.title));
}

export const BUILTIN_SONGS: SongSheet[] = loadBuiltin();

/**
 * Kept for API compatibility. Returns the first built-in song id when available.
 * 4b will switch the default to null (no panel shown), at which point callers
 * should stop importing this.
 */
export const DEFAULT_SONG_ID: string = BUILTIN_SONGS[0]?.id ?? 'huoche';

export function findBuiltinSong(id: string): SongSheet | undefined {
  return BUILTIN_SONGS.find((s) => s.id === id);
}
