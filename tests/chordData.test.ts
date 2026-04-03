import { describe, test, expect } from 'bun:test';
import {
  NOTES,
  NOTE_DISPLAY,
  CIRCLE_OF_FIFTHS,
  generateVoicings,
  groupByDegree,
  findOptimalCombination,
  voicingKey,
  PROGRESSIONS,
  type NoteName,
} from '../src/chordData';

describe('NOTES and NOTE_DISPLAY', () => {
  test('12 chromatic notes', () => {
    expect(NOTES).toHaveLength(12);
  });

  test('every note has a display name', () => {
    for (const n of NOTES) {
      expect(NOTE_DISPLAY[n]).toBeDefined();
      expect(NOTE_DISPLAY[n].length).toBeGreaterThan(0);
    }
  });

  test('circle of fifths has 12 unique notes', () => {
    expect(CIRCLE_OF_FIFTHS).toHaveLength(12);
    expect(new Set(CIRCLE_OF_FIFTHS).size).toBe(12);
  });
});

describe('generateVoicings', () => {
  test('generates voicings for every key', () => {
    for (const key of NOTES) {
      const v = generateVoicings(key);
      expect(v.length).toBeGreaterThan(0);
    }
  });

  test('each voicing has valid fields', () => {
    const v = generateVoicings('C');
    for (const voicing of v) {
      expect(voicing.name).toBeTruthy();
      expect(voicing.degree).toBeGreaterThanOrEqual(1);
      expect(voicing.degree).toBeLessThanOrEqual(6);
      expect(voicing.frets).toHaveLength(6);
      expect(voicing.shapeOrigin).toMatch(/^[EA]m?$/);
      expect(voicing.barrePosition).toBeGreaterThanOrEqual(0);
    }
  });

  test('all 6 degrees are covered', () => {
    const v = generateVoicings('C');
    const degrees = new Set(v.map((x) => x.degree));
    expect(degrees.size).toBe(6);
  });

  test('generates both E and A shapes', () => {
    const v = generateVoicings('C');
    const shapes = new Set(v.map((x) => x.shapeOrigin));
    expect(shapes.has('E') || shapes.has('Em')).toBe(true);
    expect(shapes.has('A') || shapes.has('Am')).toBe(true);
  });

  test('no fret exceeds maxFret', () => {
    const v = generateVoicings('C', 17);
    for (const voicing of v) {
      for (const f of voicing.frets) {
        if (f > 0) expect(f).toBeLessThanOrEqual(17);
      }
    }
  });

  test('C major I chord is named C', () => {
    const v = generateVoicings('C');
    const ones = v.filter((x) => x.degree === 1);
    expect(ones.length).toBeGreaterThan(0);
    expect(ones[0].name).toBe('C');
  });

  test('Eb key uses flat display names', () => {
    const v = generateVoicings('D#');
    const ones = v.filter((x) => x.degree === 1);
    expect(ones[0].name).toBe('Eb');
  });
});

describe('groupByDegree', () => {
  test('groups into 6 degrees', () => {
    const v = generateVoicings('G');
    const g = groupByDegree(v);
    expect(g.size).toBe(6);
    for (let d = 1; d <= 6; d++) {
      expect(g.get(d)!.length).toBeGreaterThan(0);
    }
  });
});

describe('findOptimalCombination', () => {
  test('returns one voicing per unique degree', () => {
    const g = groupByDegree(generateVoicings('C'));
    const opt = findOptimalCombination(g);
    const degrees = opt.map((v) => v.degree);
    // Default fifths order: 4,1,5,2,6,3 → 6 unique
    expect(new Set(degrees).size).toBe(6);
  });

  test('prefers low frets', () => {
    const g = groupByDegree(generateVoicings('C'));
    const opt = findOptimalCombination(g);
    for (const v of opt) {
      expect(v.barrePosition).toBeLessThan(12);
    }
  });

  test('respects custom degree order', () => {
    const g = groupByDegree(generateVoicings('C'));
    const opt = findOptimalCombination(g, [1, 5, 6, 4]);
    const degrees = opt.map((v) => v.degree);
    expect(new Set(degrees)).toEqual(new Set([1, 5, 6, 4]));
  });

  test('handles progression with repeated degrees', () => {
    const g = groupByDegree(generateVoicings('C'));
    const opt = findOptimalCombination(g, [1, 4, 5, 1]);
    // Should have 3 unique degrees
    expect(new Set(opt.map((v) => v.degree)).size).toBe(3);
  });
});

describe('voicingKey', () => {
  test('unique for different voicings', () => {
    const v = generateVoicings('C');
    const keys = v.map(voicingKey);
    // All keys should be unique
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('format includes name, shape, and barrePosition', () => {
    const v = generateVoicings('C')[0];
    const key = voicingKey(v);
    expect(key).toContain(v.name);
    expect(key).toContain(v.shapeOrigin);
    expect(key).toContain(String(v.barrePosition));
  });
});

describe('PROGRESSIONS', () => {
  test('all progressions have valid degrees', () => {
    for (const p of PROGRESSIONS) {
      expect(p.name).toBeTruthy();
      expect(p.degrees.length).toBeGreaterThanOrEqual(2);
      for (const d of p.degrees) {
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe('cross-key consistency', () => {
  test('same number of degrees for every key', () => {
    const refDegrees = 6;
    for (const key of NOTES) {
      const g = groupByDegree(generateVoicings(key));
      expect(g.size).toBe(refDegrees);
    }
  });

  test('optimal combination works for every key', () => {
    for (const key of NOTES) {
      const g = groupByDegree(generateVoicings(key));
      const opt = findOptimalCombination(g);
      expect(opt.length).toBe(6);
    }
  });
});
