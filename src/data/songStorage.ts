import type { SongSheet } from './songSheet';

const STORAGE_KEY = 'chordao:songs';

type Archive = Record<string, SongSheet>;

function readArchive(): Archive {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Archive;
  } catch {
    /* corrupted, treat as empty */
  }
  return {};
}

function writeArchive(archive: Archive): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archive));
}

export function listUserSongs(): SongSheet[] {
  return Object.values(readArchive()).sort((a, b) => a.title.localeCompare(b.title));
}

export function getUserSong(id: string): SongSheet | undefined {
  return readArchive()[id];
}

export function saveUserSong(sheet: SongSheet): void {
  const archive = readArchive();
  archive[sheet.id] = sheet;
  writeArchive(archive);
}

export function deleteUserSong(id: string): void {
  const archive = readArchive();
  delete archive[id];
  writeArchive(archive);
}

export function isUserSongId(id: string): boolean {
  return id.startsWith('user:');
}
