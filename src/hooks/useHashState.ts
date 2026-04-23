import { useEffect } from 'react';
import type { NoteName } from '../data/chordData';

export interface HashState {
  key: NoteName | null;
  prog: string | null;
  degrees: number[];
}

export function parseHash(): HashState {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return {
    key: (params.get('key') as NoteName) || null,
    prog: params.get('prog') || null,
    degrees:
      params
        .get('degrees')
        ?.split('-')
        .map(Number)
        .filter((n) => n >= 1 && n <= 6) || [],
  };
}

export function useHashSync(state: { key: NoteName; activeProg: string | null; customDegrees: number[] }): void {
  const { key, activeProg, customDegrees } = state;
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('key', key);
    if (activeProg === 'custom' && customDegrees.length >= 2) {
      params.set('prog', 'custom');
      params.set('degrees', customDegrees.join('-'));
    } else if (activeProg) {
      params.set('prog', activeProg);
    }
    window.history.replaceState(null, '', `#${params.toString()}`);
  }, [key, activeProg, customDegrees]);
}
