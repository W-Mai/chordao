// Chromatic note names (internal, for calculation)
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
type NoteName = (typeof NOTES)[number];

// Display names using flats where conventional
const NOTE_DISPLAY: Record<string, string> = {
  C: 'C',
  'C#': 'Db',
  D: 'D',
  'D#': 'Eb',
  E: 'E',
  F: 'F',
  'F#': 'F#/Gb',
  G: 'G',
  'G#': 'Ab',
  A: 'A',
  'A#': 'Bb',
  B: 'B',
};

// Standard tuning open string notes (E2 A2 D3 G3 B3 E4)
const OPEN_STRING_NOTES: NoteName[] = ['E', 'A', 'D', 'G', 'B', 'E'];

// Circle of fifths order for key selection UI
const CIRCLE_OF_FIFTHS: NoteName[] = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F'];

// Fret positions for each string (6 strings, high-to-low: E A D G B E)
// -1 means muted, 0 means open
export interface ChordShape {
  name: string; // e.g. "E", "Em", "A", "Am"
  frets: number[]; // length 6, relative to barre position
  baseFret: number; // 0 for open chords
  barreString?: number; // which strings are barred (optional)
}

// Base open chord shapes (frets relative to nut)
// String order: E2 A D G B E4
const BASE_SHAPES: Record<string, { major: number[]; minor: number[] }> = {
  C: {
    major: [-1, 3, 2, 0, 1, 0], // C major, root on 5th string
    minor: [-1, 3, 1, 0, 1, 0], // C minor
  },
  A: {
    major: [-1, 0, 2, 2, 2, 0], // A major, root on 5th string
    minor: [-1, 0, 2, 2, 1, 0], // A minor
  },
  G: {
    major: [3, 2, 0, 0, 0, 3], // G major, root on 6th string
    minor: [3, 1, 0, 0, 0, 3], // G minor
  },
  E: {
    major: [0, 2, 2, 1, 0, 0], // E major, root on 6th string
    minor: [0, 2, 2, 0, 0, 0], // E minor
  },
  D: {
    major: [-1, -1, 0, 2, 3, 2], // D major, root on 4th string
    minor: [-1, -1, 0, 2, 3, 1], // D minor
  },
};

const BASE_SHAPES_7TH: Record<string, { major: number[]; minor: number[] }> = {
  C: {
    major: [-1, 3, 2, 3, 1, 0], // C7
    minor: [-1, 3, 1, 3, 1, 0], // Cm7
  },
  A: {
    major: [-1, 0, 2, 0, 2, 0], // A7
    minor: [-1, 0, 2, 0, 1, 0], // Am7
  },
  G: {
    major: [3, 2, 0, 0, 0, 1], // G7
    minor: [3, 1, 0, 0, 0, 1], // Gm7
  },
  E: {
    major: [0, 2, 0, 1, 0, 0], // E7
    minor: [0, 2, 0, 0, 0, 0], // Em7
  },
  D: {
    major: [-1, -1, 0, 2, 1, 2], // D7
    minor: [-1, -1, 0, 2, 1, 1], // Dm7
  },
};

export type ShapeSystem = 'ea' | 'caged';
export type ShapeSet = 'triad' | 'seventh';

export interface ChordVoicing {
  name: string; // e.g. "C", "Dm"
  frets: number[]; // absolute fret positions per string (-1 = muted)
  baseFret: number; // lowest fret used (for display)
  barrePosition: number; // barre/capo fret (the offset from open shape)
  shapeOrigin: string; // which base shape it derives from ("E" or "A")
  degree: number; // scale degree 1-6
}

function noteIndex(note: NoteName): number {
  return NOTES.indexOf(note);
}

function noteName(index: number): NoteName {
  return NOTES[((index % 12) + 12) % 12];
}

// Semitone offset from base shape root to target note
function semitoneOffset(from: NoteName, to: NoteName): number {
  return (((noteIndex(to) - noteIndex(from)) % 12) + 12) % 12;
}

// Major scale intervals in semitones: 1=0, 2=2, 3=4, 4=5, 5=7, 6=9
const SCALE_DEGREES = [
  { interval: 0, suffix: '', degree: 1 }, // 1  major
  { interval: 2, suffix: 'm', degree: 2 }, // 2m minor
  { interval: 4, suffix: 'm', degree: 3 }, // 3m minor
  { interval: 5, suffix: '', degree: 4 }, // 4  major
  { interval: 7, suffix: '', degree: 5 }, // 5  major
  { interval: 9, suffix: 'm', degree: 6 }, // 6m minor
];

// Generate all voicings for a given key
// Shape root notes for offset calculation
const SHAPE_ROOTS: Record<string, NoteName> = { C: 'C', A: 'A', G: 'G', E: 'E', D: 'D' };

export function generateVoicings(
  key: NoteName,
  maxFret = 17,
  shapeSet: ShapeSet = 'triad',
  shapeSystem: ShapeSystem = 'ea',
): ChordVoicing[] {
  const voicings: ChordVoicing[] = [];
  const shapes = shapeSet === 'seventh' ? BASE_SHAPES_7TH : BASE_SHAPES;
  const shapeKeys = shapeSystem === 'caged' ? ['C', 'A', 'G', 'E', 'D'] : ['E', 'A'];

  for (const deg of SCALE_DEGREES) {
    const targetNote = noteName(noteIndex(key) + deg.interval);
    const seventhSuffix = shapeSet === 'seventh' ? '7' : '';
    const chordName = `${NOTE_DISPLAY[targetNote]}${deg.suffix}${seventhSuffix}`;
    const isMajor = deg.suffix === '';
    const quality = isMajor ? 'major' : 'minor';
    const shapeSuffix = isMajor ? '' : 'm';

    for (const sk of shapeKeys) {
      const baseFrets = shapes[sk][quality];
      const baseRoot = SHAPE_ROOTS[sk];
      const shapeLabel = `${sk}${shapeSuffix}`;
      const offset = semitoneOffset(baseRoot, targetNote);
      // Generate base position and +12 octave
      for (const o of [offset, offset + 12]) {
        const frets = baseFrets.map((f) => (f === -1 ? -1 : f + o));
        const playedFrets = frets.filter((f) => f > 0);
        if (playedFrets.length === 0) continue;
        const maxF = Math.max(...playedFrets);
        if (maxF > maxFret) continue;
        const baseFret = Math.min(...playedFrets);
        voicings.push({
          name: chordName,
          frets,
          baseFret,
          barrePosition: o,
          shapeOrigin: shapeLabel,
          degree: deg.degree,
        });
      }
    }
  }

  return voicings;
}

// Group voicings by degree
export function groupByDegree(voicings: ChordVoicing[]): Map<number, ChordVoicing[]> {
  const map = new Map<number, ChordVoicing[]>();
  for (const v of voicings) {
    const arr = map.get(v.degree) ?? [];
    arr.push(v);
    map.set(v.degree, arr);
  }
  return map;
}

// Find the optimal 6-chord combination (one per degree) minimizing total fret movement
export type BassPrefer = 'none' | 'ascending' | 'descending';

export function findOptimalCombination(
  grouped: Map<number, ChordVoicing[]>,
  degreeOrder?: number[],
  prefer: BassPrefer = 'none',
): ChordVoicing[] {
  return findAllCombinations(grouped, degreeOrder, prefer)[0] ?? [];
}

// Return multiple optimal combinations sorted by score, deduplicated by root position
export function findAllCombinations(
  grouped: Map<number, ChordVoicing[]>,
  degreeOrder?: number[],
  prefer: BassPrefer = 'none',
): ChordVoicing[][] {
  const order = degreeOrder ?? [4, 1, 5, 2, 6, 3];
  const seen = new Set<number>();
  const uniqueOrder = order.filter((d) => {
    if (seen.has(d)) return false;
    seen.add(d);
    return true;
  });
  const options = uniqueOrder.map((d) => grouped.get(d) ?? []);
  const n = uniqueOrder.length;

  const results: { combo: ChordVoicing[]; score: number }[] = [];

  function search(idx: number, current: ChordVoicing[]) {
    if (idx === n) {
      const positions = current.map((c) => c.barrePosition);
      const highCount = positions.filter((p) => p >= 12).length;
      const span = Math.max(...positions) - Math.min(...positions);
      let move = 0;
      let directionPenalty = 0;
      for (let i = 0; i < current.length - 1; i++) {
        const diff = current[i + 1].barrePosition - current[i].barrePosition;
        move += Math.abs(diff);
        // Penalize wrong direction steps
        if (prefer === 'ascending' && diff < 0) directionPenalty += Math.abs(diff) * 10;
        if (prefer === 'descending' && diff > 0) directionPenalty += Math.abs(diff) * 10;
      }
      const score = highCount * 1000 + directionPenalty + span * 100 + move;
      results.push({ combo: [...current], score });
      return;
    }
    if (options[idx].length === 0) return;
    for (const voicing of options[idx]) {
      current.push(voicing);
      search(idx + 1, current);
      current.pop();
    }
  }

  search(0, []);
  results.sort((a, b) => a.score - b.score);

  // Deduplicate by root position of first chord (one combo per root position)
  const filtered: ChordVoicing[][] = [];
  const seenRoots = new Set<number>();
  for (const r of results) {
    const root = r.combo[0]?.barrePosition ?? 0;
    if (seenRoots.has(root)) continue;
    seenRoots.add(root);
    filtered.push(r.combo);
  }
  return filtered;
}

export { NOTES, NOTE_DISPLAY, CIRCLE_OF_FIFTHS, type NoteName };

// Stable unique key for a voicing
export function voicingKey(v: ChordVoicing): string {
  return `${v.name}-${v.shapeOrigin}-${v.barrePosition}`;
}

// Common chord progressions (degree-based)
export const PROGRESSIONS = [
  { name: 'progPopCanon', degrees: [1, 5, 6, 4] },
  { name: 'progCanonExt', degrees: [1, 5, 6, 3, 4, 1, 4, 5] },
  { name: 'progCPopBallad', degrees: [1, 3, 6, 4, 2, 6, 3, 5] },
  { name: 'progClassic50s', degrees: [1, 6, 4, 5] },
  { name: 'progSad', degrees: [6, 4, 1, 5] },
  { name: 'progAxis', degrees: [1, 5, 6, 3] },
  { name: 'progCountry', degrees: [1, 4, 5, 1] },
  { name: 'progBlues', degrees: [1, 1, 4, 4, 1, 1, 5, 4, 1] },
  { name: 'progAndalusian', degrees: [6, 5, 4, 3] },
  { name: 'progJazz251', degrees: [2, 5, 1] },
];

// Interval labels by semitone distance from root
const INTERVAL_LABELS: Record<number, string> = {
  0: 'R',
  1: 'b2',
  2: '2',
  3: 'b3',
  4: '3',
  5: '4',
  6: 'b5',
  7: '5',
  8: '#5',
  9: '6',
  10: 'b7',
  11: '7',
};

// Get interval label for each string in a voicing
export function getVoicingIntervals(v: ChordVoicing): (string | null)[] {
  const rootMatch = v.name.match(/^([A-G][#b]?)/);
  if (!rootMatch) return v.frets.map(() => null);
  const rootDisplay = rootMatch[1];
  const rootEntry = Object.entries(NOTE_DISPLAY).find(([, d]) => d === rootDisplay || d.split('/')[0] === rootDisplay);
  if (!rootEntry) return v.frets.map(() => null);
  const rootIdx = NOTES.indexOf(rootEntry[0] as NoteName);

  return v.frets.map((fret, si) => {
    if (fret < 0) return null;
    const openIdx = NOTES.indexOf(OPEN_STRING_NOTES[si]);
    const noteIdx = (openIdx + fret) % 12;
    const interval = (((noteIdx - rootIdx) % 12) + 12) % 12;
    return INTERVAL_LABELS[interval] ?? null;
  });
}

// Generate interval map for entire fretboard given a root note
// Returns [string][fret] = interval label
export function getFretboardIntervals(root: NoteName, maxFret = 17): string[][] {
  const rootIdx = NOTES.indexOf(root);
  return OPEN_STRING_NOTES.map((open) => {
    const openIdx = NOTES.indexOf(open);
    return Array.from({ length: maxFret + 1 }, (_, fret) => {
      const noteIdx = (openIdx + fret) % 12;
      const interval = (((noteIdx - rootIdx) % 12) + 12) % 12;
      return INTERVAL_LABELS[interval];
    });
  });
}

export { OPEN_STRING_NOTES, INTERVAL_LABELS };
