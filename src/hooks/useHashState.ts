import { useEffect } from 'react';
import type { NoteName, BassPrefer } from '../data/chordData';

export type FullscreenPanel = 'grid' | 'fret' | null;

export interface HashState {
  key: NoteName | null;
  prog: string | null;
  degrees: number[];
  combo: number | null; // null = use default (All, -1); otherwise a specific combo index (0..n)
  prefer: BassPrefer | null; // null = use default ('none')
  intervalMode: boolean; // defaults to false
  visibleIntervals: string[] | null; // null = use default/localStorage
  fullscreen: FullscreenPanel;
  song: string | null; // null = default song; otherwise built-in id or 'user:<slug>'
  sheetPayload: string | null; // compressed sheet text (overrides song=)
}

export function parseHash(): HashState {
  const params = new URLSearchParams(window.location.hash.slice(1));

  const comboRaw = params.get('combo');
  const combo = comboRaw == null ? null : Number.isFinite(Number(comboRaw)) ? Number(comboRaw) : null;

  const preferRaw = params.get('prefer');
  const prefer: BassPrefer | null =
    preferRaw === 'ascending' || preferRaw === 'descending' || preferRaw === 'none' ? preferRaw : null;

  const fsRaw = params.get('fs');
  const fullscreen: FullscreenPanel = fsRaw === 'grid' || fsRaw === 'fret' ? fsRaw : null;

  const ivsRaw = params.get('ivs');
  const visibleIntervals = ivsRaw
    ? ivsRaw.split(',').filter((iv) => ['R', 'b3', '3', '4', '5', 'b7', '7'].includes(iv))
    : null;

  return {
    key: (params.get('key') as NoteName) || null,
    prog: params.get('prog') || null,
    degrees:
      params
        .get('degrees')
        ?.split('-')
        .map(Number)
        .filter((n) => n >= 1 && n <= 6) || [],
    combo,
    prefer,
    intervalMode: params.get('im') === '1',
    visibleIntervals,
    fullscreen,
    song: params.get('song') || null,
    sheetPayload: params.get('sheet') || null,
  };
}

export interface HashSyncState {
  key: NoteName;
  activeProg: string | null;
  customDegrees: number[];
  comboIdx: number; // -1 = All (default, omit)
  positionPrefer: BassPrefer; // 'none' = default, omit
  intervalMode: boolean;
  visibleIntervals: Set<string>; // only written when intervalMode=true
  fullscreen: FullscreenPanel;
  songId: string | null; // null = panel hidden; omit from URL
  defaultSongId: string | null; // omit songId when it matches this
}

export function useHashSync(state: HashSyncState): void {
  const {
    key,
    activeProg,
    customDegrees,
    comboIdx,
    positionPrefer,
    intervalMode,
    visibleIntervals,
    fullscreen,
    songId,
    defaultSongId,
  } = state;
  // Flatten the Set so effect deps stay primitive
  const ivsKey = [...visibleIntervals].sort().join(',');

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('key', key);
    if (activeProg === 'custom' && customDegrees.length >= 2) {
      params.set('prog', 'custom');
      params.set('degrees', customDegrees.join('-'));
    } else if (activeProg) {
      params.set('prog', activeProg);
    }
    if (comboIdx !== 0) params.set('combo', String(comboIdx));
    if (positionPrefer !== 'none') params.set('prefer', positionPrefer);
    if (intervalMode) {
      params.set('im', '1');
      // Only write ivs when user has customized from the default full set (6 items)
      const DEFAULT_IVS = ['3', '5', '7', 'R', 'b3', 'b7'].join(',');
      if (ivsKey !== DEFAULT_IVS) params.set('ivs', ivsKey);
    }
    if (fullscreen) params.set('fs', fullscreen);
    if (songId != null && songId !== defaultSongId) params.set('song', songId);
    window.history.replaceState(null, '', `#${params.toString()}`);
  }, [
    key,
    activeProg,
    customDegrees,
    comboIdx,
    positionPrefer,
    intervalMode,
    ivsKey,
    fullscreen,
    songId,
    defaultSongId,
  ]);
}
