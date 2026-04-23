import {
  NOTES,
  NOTE_DISPLAY,
  generateVoicings,
  groupByDegree,
  findOptimalCombination,
  INTERVAL_LABELS,
  type NoteName,
  type ChordVoicing,
} from '../../data/chordData';

export type GameMode = 'locate' | 'reverse' | 'sprint' | 'chain' | 'memory' | 'interval';
export type Difficulty = 'easy' | 'medium' | 'hard';

export const DEGREE_LABELS: Record<number, string> = { 1: 'I', 2: 'IIm', 3: 'IIIm', 4: 'IV', 5: 'V', 6: 'VIm' };
export const DIFFICULTY_DEGREES: Record<Difficulty, number[]> = {
  easy: [1],
  medium: [1, 4, 5],
  hard: [1, 2, 3, 4, 5, 6],
};
export const DIFFICULTY_TIME: Record<Difficulty, number> = { easy: 10, medium: 7, hard: 5 };
export const ALL_DEGREES = [1, 2, 3, 4, 5, 6];
export const CHAIN_ORDER = [4, 1, 5, 2, 6, 3];
export const TOTAL_QUESTIONS = 10;

export const OPEN_NOTES: NoteName[] = ['E', 'A', 'D', 'G', 'B', 'E'];
export const STRING_NAMES = ['⑥', '⑤', '④', '③', '②', '①'];
export const PRACTICE_INTERVALS = ['b3', '3', '4', '5', 'b7', '7'];

export interface IntervalQuestion {
  rootSi: number;
  rootFret: number;
  rootNote: string;
  targetInterval: string;
  targetPositions: [number, number][];
}

export interface Question {
  key: NoteName;
  degree: number;
  voicing: ChordVoicing;
  allVoicings: ChordVoicing[];
  optimal: ChordVoicing[];
  reverseOptions: number[];
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateIntervalQuestion(difficulty: Difficulty): IntervalQuestion {
  const rootSi = Math.floor(Math.random() * 6);
  const maxFret = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 9 : 12;
  const rootFret = Math.floor(Math.random() * (maxFret + 1));
  const openIdx = NOTES.indexOf(OPEN_NOTES[rootSi]);
  const rootNoteIdx = (openIdx + rootFret) % 12;
  const rootNote = NOTE_DISPLAY[NOTES[rootNoteIdx]];
  const pool =
    difficulty === 'easy' ? ['3', '5'] : difficulty === 'medium' ? ['b3', '3', '5', 'b7'] : PRACTICE_INTERVALS;
  const targetInterval = pool[Math.floor(Math.random() * pool.length)];
  const targetSemitones = Number(Object.entries(INTERVAL_LABELS).find(([, v]) => v === targetInterval)![0]);

  const targets: [number, number][] = [];
  for (let si = 0; si < 6; si++) {
    for (let f = 0; f <= 17; f++) {
      const noteIdx = (NOTES.indexOf(OPEN_NOTES[si]) + f) % 12;
      const interval = (((noteIdx - rootNoteIdx) % 12) + 12) % 12;
      if (interval === targetSemitones) targets.push([si, f]);
    }
  }
  return { rootSi, rootFret, rootNote, targetInterval, targetPositions: targets };
}

export function generateQuestion(difficulty: Difficulty, mode: GameMode): Question {
  const key = NOTES[Math.floor(Math.random() * 12)];
  const voicings = generateVoicings(key);
  const grouped = groupByDegree(voicings);
  const optimal = findOptimalCombination(grouped);

  const degrees = mode === 'reverse' ? ALL_DEGREES : DIFFICULTY_DEGREES[difficulty];
  const degree = randomItem(degrees);
  const degVoicings = grouped.get(degree) ?? [];
  const voicing = randomItem(degVoicings);

  const optionPool = difficulty === 'easy' ? [1, 4, 5] : ALL_DEGREES;
  const options = new Set([degree]);
  while (options.size < Math.min(3, optionPool.length)) options.add(randomItem(optionPool));
  const reverseOptions = [...options].sort(() => Math.random() - 0.5);

  return { key, degree, voicing, allVoicings: voicings, optimal, reverseOptions };
}
