import { describe, test, expect } from 'bun:test';
import { parseSongSheetText, serializeSongSheet } from '../src/data/songSheetText';
import { huoche } from '../src/data/songs/huoche';

describe('parseSongSheetText', () => {
  test('parses minimal sheet', () => {
    const text = `title: Test
key: C

--- s1 ---
a[b]c | d[e]f @ 1 5
`;
    const { sheet, errors } = parseSongSheetText(text);
    expect(errors).toEqual([]);
    expect(sheet).not.toBeNull();
    expect(sheet!.title).toBe('Test');
    expect(sheet!.key).toBe('C');
    expect(sheet!.sections).toHaveLength(1);
    expect(sheet!.sections[0].name).toBe('s1');
    expect(sheet!.sections[0].lines[0].bars).toHaveLength(2);
    expect(sheet!.sections[0].lines[0].bars[0].degree).toBe(1);
    expect(sheet!.sections[0].lines[0].bars[1].degree).toBe(5);
  });

  test('reports missing @ suffix', () => {
    const { errors } = parseSongSheetText(`title: T\nkey: C\n--- s ---\na[b]c | d[e]f\n`);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.message.includes('@'))).toBe(true);
  });

  test('reports bar/degree count mismatch', () => {
    const { errors } = parseSongSheetText(`title: T\nkey: C\n--- s ---\na | b | c @ 1 2m\n`);
    expect(errors.some((e) => e.message.includes('!='))).toBe(true);
  });

  test('reports unknown key', () => {
    const { errors } = parseSongSheetText(`title: T\nkey: H\n--- s ---\na[b]c @ 1\n`);
    expect(errors.some((e) => e.message.includes('Unknown key'))).toBe(true);
  });

  test('accepts 2m/3m/6m and bare 1/4/5', () => {
    const { sheet } = parseSongSheetText(`title: T\nkey: C\n--- s ---\na | b | c | d | e | f @ 1 2m 3m 4 5 6m\n`);
    expect(sheet!.sections[0].lines[0].bars.map((b) => b.degree)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('serializeSongSheet round-trip', () => {
  test('huoche survives round-trip', () => {
    const text = serializeSongSheet(huoche);
    const { sheet, errors } = parseSongSheetText(text);
    expect(errors).toEqual([]);
    expect(sheet!.title).toBe(huoche.title);
    expect(sheet!.key).toBe(huoche.key);
    expect(sheet!.strum).toBe(huoche.strum);
    expect(sheet!.sections.length).toBe(huoche.sections.length);
    // Compare bar sources in the first line of the first section
    const firstLineBars = sheet!.sections[0].lines[0].bars;
    const origBars = huoche.sections[0].lines[0].bars;
    expect(firstLineBars.map((b) => b.source)).toEqual(origBars.map((b) => b.source));
    expect(firstLineBars.map((b) => b.degree)).toEqual(origBars.map((b) => b.degree));
  });
});
