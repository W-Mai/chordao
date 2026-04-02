// Chromatic note names (internal, for calculation)
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
type NoteName = (typeof NOTES)[number];

// Display names using flats where conventional
const NOTE_DISPLAY: Record<string, string> = {
  'C': 'C', 'C#': 'Db', 'D': 'D', 'D#': 'Eb', 'E': 'E', 'F': 'F',
  'F#': 'F#', 'G': 'G', 'G#': 'Ab', 'A': 'A', 'A#': 'Bb', 'B': 'B',
};

// Circle of fifths order for key selection UI
const CIRCLE_OF_FIFTHS: NoteName[] = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F'];

// Fret positions for each string (6 strings, high-to-low: E A D G B E)
// -1 means muted, 0 means open
export interface ChordShape {
  name: string;        // e.g. "E", "Em", "A", "Am"
  frets: number[];     // length 6, relative to barre position
  baseFret: number;    // 0 for open chords
  barreString?: number; // which strings are barred (optional)
}

// Base open chord shapes (frets relative to nut)
// String order: E2 A D G B E4
const BASE_SHAPES: Record<string, { major: number[]; minor: number[] }> = {
  E: {
    major: [0, 2, 2, 1, 0, 0],  // E major
    minor: [0, 2, 2, 0, 0, 0],  // E minor
  },
  A: {
    major: [-1, 0, 2, 2, 2, 0], // A major
    minor: [-1, 0, 2, 2, 1, 0], // A minor
  },
};

export interface ChordVoicing {
  name: string;          // e.g. "C", "Dm"
  frets: number[];       // absolute fret positions per string (-1 = muted)
  baseFret: number;      // lowest fret used (for display)
  barrePosition: number; // barre/capo fret (the offset from open shape)
  shapeOrigin: string;   // which base shape it derives from ("E" or "A")
  degree: number;        // scale degree 1-6
}

function noteIndex(note: NoteName): number {
  return NOTES.indexOf(note);
}

function noteName(index: number): NoteName {
  return NOTES[((index % 12) + 12) % 12];
}

// Semitone offset from base shape root to target note
function semitoneOffset(from: NoteName, to: NoteName): number {
  return ((noteIndex(to) - noteIndex(from)) % 12 + 12) % 12;
}

// Major scale intervals in semitones: 1=0, 2=2, 3=4, 4=5, 5=7, 6=9
const SCALE_DEGREES = [
  { interval: 0, suffix: '', degree: 1 },   // 1  major
  { interval: 2, suffix: 'm', degree: 2 },  // 2m minor
  { interval: 4, suffix: 'm', degree: 3 },  // 3m minor
  { interval: 5, suffix: '', degree: 4 },   // 4  major
  { interval: 7, suffix: '', degree: 5 },   // 5  major
  { interval: 9, suffix: 'm', degree: 6 },  // 6m minor
];

// Generate all voicings for a given key
export function generateVoicings(key: NoteName, maxFret = 17): ChordVoicing[] {
  const voicings: ChordVoicing[] = [];

  for (const deg of SCALE_DEGREES) {
    const targetNote = noteName(noteIndex(key) + deg.interval);
    const chordName = `${NOTE_DISPLAY[targetNote]}${deg.suffix}`;
    const isMajor = deg.suffix === '';
    const quality = isMajor ? 'major' : 'minor';
    const shapeSuffix = isMajor ? '' : 'm';

    for (const [baseRoot, baseFrets, shapeLabel] of [
      ['E', BASE_SHAPES.E[quality], `E${shapeSuffix}`],
      ['A', BASE_SHAPES.A[quality], `A${shapeSuffix}`],
    ] as [NoteName, number[], string][]) {
      const offset = semitoneOffset(baseRoot, targetNote);
      // Generate base position and +12 octave
      for (const o of [offset, offset + 12]) {
        const frets = baseFrets.map(f => (f === -1 ? -1 : f + o));
        const playedFrets = frets.filter(f => f > 0);
        if (playedFrets.length === 0) continue;
        const maxF = Math.max(...playedFrets);
        if (maxF > maxFret) continue;
        const baseFret = Math.min(...playedFrets);
        voicings.push({ name: chordName, frets, baseFret, barrePosition: o, shapeOrigin: shapeLabel, degree: deg.degree });
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
export function findOptimalCombination(grouped: Map<number, ChordVoicing[]>, degreeOrder?: number[]): ChordVoicing[] {
  // Default: circle of fifths order
  const order = degreeOrder ?? [4, 1, 5, 2, 6, 3];
  // Deduplicate while preserving order
  const seen = new Set<number>();
  const uniqueOrder = order.filter(d => { if (seen.has(d)) return false; seen.add(d); return true; });
  const options = uniqueOrder.map(d => grouped.get(d) ?? []);

  // Prefer voicings below fret 12, minimize span, tiebreak on movement
  let bestCombo: ChordVoicing[] = [];
  let bestScore = Infinity;

  const n = uniqueOrder.length;

  function search(idx: number, current: ChordVoicing[]) {
    if (idx === n) {
      const positions = current.map(c => c.barrePosition);
      const highCount = positions.filter(p => p >= 12).length;
      const span = Math.max(...positions) - Math.min(...positions);
      let move = 0;
      for (let i = 0; i < current.length - 1; i++) {
        move += Math.abs(current[i].barrePosition - current[i + 1].barrePosition);
      }
      const score = highCount * 1000 + span * 100 + move;
      if (score < bestScore) {
        bestScore = score;
        bestCombo = [...current];
      }
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
  return bestCombo;
}

export { NOTES, NOTE_DISPLAY, CIRCLE_OF_FIFTHS, type NoteName };

// Stable unique key for a voicing
export function voicingKey(v: ChordVoicing): string {
  return `${v.name}-${v.shapeOrigin}-${v.barrePosition}`;
}

// Common chord progressions (degree-based)
export const PROGRESSIONS = [
  { name: 'Pop Canon', degrees: [1, 5, 6, 4] },
  { name: 'Canon Ext.', degrees: [1, 5, 6, 3, 4, 1, 4, 5] },
  { name: 'C-Pop Ballad', degrees: [1, 3, 6, 4, 2, 6, 3, 5] },
  { name: 'Classic 50s', degrees: [1, 6, 4, 5] },
  { name: 'Sad', degrees: [6, 4, 1, 5] },
  { name: 'Axis', degrees: [1, 5, 6, 3] },
  { name: 'Country', degrees: [1, 4, 5, 1] },
  { name: 'Blues', degrees: [1, 1, 4, 4, 1, 1, 5, 4, 1] },
  { name: 'Andalusian', degrees: [6, 5, 4, 3] },
  { name: 'Jazz ii-V-I', degrees: [2, 5, 1] },
];
