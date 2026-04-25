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
  strum?: string;
  lines: Line[];
}

export interface SongSheet {
  id: string;
  title: string;
  key: NoteName;
  strum?: string;
  bpm?: number;
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
/** One chord slot in the playback stream. */
export interface PlaybackStep {
  degree: number;
  sectionIdx: number;
  lineIdx: number;
  barIdx: number;
  chordIdx: number;
  beats: number;
  strum?: string;
}

/**
 * Flatten a sheet into an ordered playback stream. Each bar is 4 beats total;
 * bars with N chords split evenly so each chord gets 4/N beats.
 */
export function flattenForPlayback(sheet: SongSheet, beatsPerBar = 4): PlaybackStep[] {
  const out: PlaybackStep[] = [];
  sheet.sections.forEach((section, sectionIdx) => {
    const strum = section.strum ?? sheet.strum;
    section.lines.forEach((line, lineIdx) =>
      line.bars.forEach((bar, barIdx) => {
        const n = Math.max(1, bar.chords.length);
        const perChord = beatsPerBar / n;
        bar.chords.forEach((c, chordIdx) => {
          out.push({ degree: c.degree, sectionIdx, lineIdx, barIdx, chordIdx, beats: perChord, strum });
        });
      }),
    );
  });
  return out;
}

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
