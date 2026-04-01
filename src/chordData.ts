// Chromatic note names
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
type NoteName = (typeof NOTES)[number];

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

// Derive a chord voicing by shifting a base shape up the neck
function deriveVoicing(
  baseRoot: NoteName,
  baseFrets: number[],
  targetRoot: NoteName,
  chordName: string,
  degree: number,
  shapeOrigin: string,
): ChordVoicing {
  const offset = semitoneOffset(baseRoot, targetRoot);
  const frets = baseFrets.map(f => (f === -1 ? -1 : f + offset));
  const playedFrets = frets.filter(f => f > 0);
  const baseFret = playedFrets.length > 0 ? Math.min(...playedFrets) : 0;
  return { name: chordName, frets, baseFret, shapeOrigin, degree };
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
export function generateVoicings(key: NoteName): ChordVoicing[] {
  const voicings: ChordVoicing[] = [];

  for (const deg of SCALE_DEGREES) {
    const targetNote = noteName(noteIndex(key) + deg.interval);
    const chordName = `${targetNote}${deg.suffix}`;
    const isMajor = deg.suffix === '';
    const quality = isMajor ? 'major' : 'minor';

    // Derive from E shape
    voicings.push(
      deriveVoicing('E', BASE_SHAPES.E[quality], targetNote, chordName, deg.degree, `E${isMajor ? '' : 'm'}`)
    );
    // Derive from A shape
    voicings.push(
      deriveVoicing('A', BASE_SHAPES.A[quality], targetNote, chordName, deg.degree, `A${isMajor ? '' : 'm'}`)
    );
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
export function findOptimalCombination(grouped: Map<number, ChordVoicing[]>): ChordVoicing[] {
  const degrees = [1, 2, 3, 4, 5, 6];
  const options = degrees.map(d => grouped.get(d) ?? []);

  // For each combination, compute total pairwise fret distance
  let bestCombo: ChordVoicing[] = [];
  let bestCost = Infinity;

  function avgFret(v: ChordVoicing): number {
    const played = v.frets.filter(f => f >= 0);
    if (played.length === 0) return 0;
    return played.reduce((a, b) => a + b, 0) / played.length;
  }

  // Brute force: 2^6 = 64 combinations (2 voicings per degree)
  function search(idx: number, current: ChordVoicing[]) {
    if (idx === 6) {
      let cost = 0;
      for (let i = 0; i < current.length - 1; i++) {
        cost += Math.abs(avgFret(current[i]) - avgFret(current[i + 1]));
      }
      if (cost < bestCost) {
        bestCost = cost;
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

export { NOTES, type NoteName };
