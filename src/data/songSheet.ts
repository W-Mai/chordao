import type { NoteName } from './chordData';

/** A single chord segment inside a bar. source holds its own lyric fragment with [X] accent marker. */
export interface Chord {
  degree: number; // 1..6 diatonic degree
  source: string; // lyric fragment with [X] marking the accent char (exactly one accent per chord)
}

/** A bar is a fixed time unit; multiple chords may share a bar (split-chord). */
export interface Bar {
  chords: Chord[];
}

export interface Line {
  bars: Bar[];
}

export interface Section {
  name?: string;
  lines: Line[];
}

export interface SongSheet {
  id: string;
  title: string;
  key: NoteName;
  strum?: string;
  sections: Section[];
}

export interface BarRender {
  chars: Array<{ ch: string; accent: boolean }>;
}

/**
 * Parse a single source fragment. `[X]` marks X as the accent char.
 * Example: "我[那]些残梦" → [我, 那*, 些, 残, 梦]
 */
export function parseBarSource(source: string): BarRender {
  const chars: Array<{ ch: string; accent: boolean }> = [];
  let inBracket = false;
  for (const ch of source) {
    if (ch === '[') {
      inBracket = true;
      continue;
    }
    if (ch === ']') {
      inBracket = false;
      continue;
    }
    chars.push({ ch, accent: inBracket });
  }
  return { chars };
}

/**
 * Count accent runs in a source: "abc[d]e[f]g" → 2.
 * A chord count must equal this number.
 */
export function countAccents(source: string): number {
  let count = 0;
  let inBracket = false;
  for (const ch of source) {
    if (ch === '[') {
      if (!inBracket) {
        count++;
        inBracket = true;
      }
    } else if (ch === ']') {
      inBracket = false;
    }
  }
  return count;
}

/**
 * Split a combined bar source into per-chord fragments by accent-char boundaries.
 * Each fragment owns exactly one accent run and the text surrounding it, up to
 * the start of the next accent run (non-inclusive).
 *
 *   "我[那]些残[梦]" → ["我[那]些残", "[梦]"]
 *   "[a]bc[d]e"       → ["[a]bc", "[d]e"]
 *
 * If `barSource` has fewer accents than expected, returns as many fragments as accents.
 * If zero accents, returns a single fragment == barSource (caller decides how to handle).
 */
export function splitBarByAccents(barSource: string): string[] {
  const accentCount = countAccents(barSource);
  if (accentCount <= 1) return [barSource];
  const frags: string[] = [];
  let current = '';
  let depth = 0;
  let seenAccentInCurrent = false;
  for (const ch of barSource) {
    if (ch === '[') {
      // Starting a new accent run. If we already have one in the current fragment,
      // close the current fragment and start fresh.
      if (seenAccentInCurrent && depth === 0) {
        frags.push(current);
        current = '';
        seenAccentInCurrent = false;
      }
      depth++;
      current += ch;
    } else if (ch === ']') {
      depth = Math.max(0, depth - 1);
      current += ch;
      if (depth === 0) seenAccentInCurrent = true;
    } else {
      current += ch;
    }
  }
  if (current) frags.push(current);
  return frags;
}
