import type { SongSheet } from '../songSheet';
import { huoche } from './huoche';

// Registry of built-in songs. Order here determines display order in the selector.
export const BUILTIN_SONGS: SongSheet[] = [huoche];

export const DEFAULT_SONG_ID = 'huoche';

export function findBuiltinSong(id: string): SongSheet | undefined {
  return BUILTIN_SONGS.find((s) => s.id === id);
}
