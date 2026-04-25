import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { parseSongSheetText, serializeSongSheet, splitFrontmatter } from '../src/data/songSheetText';

describe('parseSongSheetText (inline header form)', () => {
  test('parses minimal sheet', () => {
    const text = `---
title: Test
key: C
---

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
    expect(sheet!.sections[0].lines[0].bars[0].chords[0].degree).toBe(1);
    expect(sheet!.sections[0].lines[0].bars[1].chords[0].degree).toBe(5);
  });

  test('reports missing @ suffix', () => {
    const { errors } = parseSongSheetText(`---\ntitle: T\nkey: C\n---\n--- s ---\na[b]c | d[e]f\n`);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.message.includes('@'))).toBe(true);
  });

  test('reports bar/degree count mismatch', () => {
    const { errors } = parseSongSheetText(`---\ntitle: T\nkey: C\n---\n--- s ---\na | b | c @ 1 2m\n`);
    expect(errors.some((e) => e.message.includes('!='))).toBe(true);
  });

  test('reports unknown key', () => {
    const { errors } = parseSongSheetText(`---\ntitle: T\nkey: H\n---\n--- s ---\na[b]c @ 1\n`);
    expect(errors.some((e) => e.message.includes('Unknown key'))).toBe(true);
  });

  test('accepts 2m/3m/6m and bare 1/4/5', () => {
    const { sheet } = parseSongSheetText(
      `---\ntitle: T\nkey: C\n---\n--- s ---\na | b | c | d | e | f @ 1 2m 3m 4 5 6m\n`,
    );
    expect(sheet!.sections[0].lines[0].bars.map((b) => b.chords[0].degree)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test('multi-chord bar: 2 accents + 2 degrees separated by /', () => {
    const { sheet, errors } = parseSongSheetText(
      `---\ntitle: T\nkey: C\n---\n--- s ---\n我[那]些残[梦] | [abc] @ 1/6m 3\n`,
    );
    expect(errors).toEqual([]);
    const bars = sheet!.sections[0].lines[0].bars;
    expect(bars).toHaveLength(2);
    expect(bars[0].chords).toHaveLength(2);
    expect(bars[0].chords[0].degree).toBe(1);
    expect(bars[0].chords[0].source).toBe('我[那]些残');
    expect(bars[0].chords[1].degree).toBe(6);
    expect(bars[0].chords[1].source).toBe('[梦]');
    expect(bars[1].chords).toHaveLength(1);
  });

  test('multi-chord bar: accent count mismatch is reported', () => {
    const { errors } = parseSongSheetText(
      `---\ntitle: T\nkey: C\n---\n--- s ---\n我[那]些残梦 @ 1/6m\n`,
    );
    expect(errors.some((e) => e.message.includes('chord') && e.message.includes('accent'))).toBe(true);
  });

  test('multi-chord bar round-trip via serializer', () => {
    const input = `---\ntitle: T\nkey: C\n---\n\n--- s ---\n我[那]些残[梦] @ 1/6m\n`;
    const { sheet } = parseSongSheetText(input);
    expect(sheet).not.toBeNull();
    const serialized = serializeSongSheet(sheet!);
    const reparsed = parseSongSheetText(serialized);
    expect(reparsed.errors).toEqual([]);
    const bars = reparsed.sheet!.sections[0].lines[0].bars;
    expect(bars[0].chords.map((c) => c.degree)).toEqual([1, 6]);
    expect(bars[0].chords.map((c) => c.source)).toEqual(['我[那]些残', '[梦]']);
  });
});

describe('splitFrontmatter', () => {
  test('extracts --- delimited header', () => {
    const { meta, body } = splitFrontmatter(`---\ntitle: X\nkey: C\n---\nrest\n`);
    expect(meta.title).toBe('X');
    expect(meta.key).toBe('C');
    expect(body.trim()).toBe('rest');
  });

  test('passes through when no frontmatter', () => {
    const { meta, body } = splitFrontmatter(`no header\nbar line\n`);
    expect(meta).toEqual({});
    expect(body).toBe('no header\nbar line\n');
  });
});

describe('songs/huoche.md', () => {
  test('parses cleanly and survives round-trip', () => {
    const raw = readFileSync('songs/huoche.md', 'utf-8');
    const { sheet, errors } = parseSongSheetText(raw);
    expect(errors).toEqual([]);
    expect(sheet!.title).toBe('火车驶向云外,梦安魂与九霄');
    expect(sheet!.key).toBe('D#');
    expect(sheet!.sections).toHaveLength(3);

    const text = serializeSongSheet(sheet!);
    const reparsed = parseSongSheetText(text);
    expect(reparsed.errors).toEqual([]);
    expect(reparsed.sheet!.title).toBe(sheet!.title);
    expect(reparsed.sheet!.key).toBe(sheet!.key);
    expect(reparsed.sheet!.sections.length).toBe(sheet!.sections.length);
  });
});
