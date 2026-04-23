import type { GameMode, Difficulty } from './gameLogic';

function bestKey(mode: GameMode, difficulty: Difficulty) {
  return `chordao:best:${mode}:${difficulty}`;
}

export function getBest(mode: GameMode, difficulty: Difficulty): number | null {
  const v = localStorage.getItem(bestKey(mode, difficulty));
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function saveBest(mode: GameMode, difficulty: Difficulty, val: number) {
  const prev = getBest(mode, difficulty);
  // Sprint: lower is better; others: higher is better
  const dominated = mode === 'sprint' ? prev !== null && prev <= val : prev !== null && prev >= val;
  if (!dominated) localStorage.setItem(bestKey(mode, difficulty), String(val));
}
