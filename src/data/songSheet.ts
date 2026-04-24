import type { NoteName } from './chordData';

export interface Bar {
  degree: number; // 1..6 diatonic degree
  source: string; // lyric fragment with [X] marking the accent char
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
 * Parse a bar source string. `[X]` marks X as the accent char.
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
