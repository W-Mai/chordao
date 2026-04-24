import type { SongSheet, Section, Bar } from './songSheet';
import { NOTES, type NoteName } from './chordData';

export interface ParseError {
  line: number; // 1-based source line
  message: string;
}

export interface ParseResult {
  sheet: SongSheet | null;
  errors: ParseError[];
}

const DEGREE_RE = /^([1-6])(m?)$/;

function parseDegreeToken(tok: string): number | null {
  const m = tok.match(DEGREE_RE);
  if (!m) return null;
  return Number(m[1]);
}

function slugify(title: string): string {
  const hash = Array.from(title).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);
  return `user:${hash.toString(36)}`;
}

/**
 * Strip a YAML-style frontmatter block (`---\n...\n---`) from the top of `text`.
 * Returns the header key-value map plus the remaining body and the line offset
 * that the body starts at (so error line numbers stay accurate).
 */
export function splitFrontmatter(text: string): { meta: Record<string, string>; body: string; bodyLineOffset: number } {
  const lines = text.split('\n');
  if (lines[0]?.trim() !== '---') return { meta: {}, body: text, bodyLineOffset: 0 };
  const meta: Record<string, string> = {};
  let i = 1;
  for (; i < lines.length; i++) {
    if (lines[i].trim() === '---') break;
    const m = lines[i].match(/^\s*([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*?)\s*$/);
    if (m) meta[m[1].toLowerCase()] = m[2];
  }
  if (i >= lines.length) return { meta: {}, body: text, bodyLineOffset: 0 }; // unterminated, treat as plain body
  const body = lines.slice(i + 1).join('\n');
  return { meta, body, bodyLineOffset: i + 1 };
}

/**
 * Parse a UG-ish text format into a SongSheet.
 * Supports optional YAML frontmatter at top. Lenient: empty lines ignored.
 */
export function parseSongSheetText(text: string): ParseResult {
  const errors: ParseError[] = [];
  const { meta, body, bodyLineOffset } = splitFrontmatter(text);
  let title = meta.title ?? '';
  let key: NoteName = NOTES.includes(meta.key as NoteName) ? (meta.key as NoteName) : 'C';
  if (meta.key && !NOTES.includes(meta.key as NoteName)) {
    errors.push({ line: 0, message: `Unknown key "${meta.key}" in frontmatter` });
  }
  let strum: string | undefined = meta.strum;
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  const ensureSection = () => {
    if (!currentSection) {
      currentSection = { lines: [] };
      sections.push(currentSection);
    }
    return currentSection;
  };

  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNo = bodyLineOffset + i + 1;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Section header: --- name ---
    const secMatch = trimmed.match(/^---\s*(.*?)\s*---$/);
    if (secMatch) {
      currentSection = { name: secMatch[1] || undefined, lines: [] };
      sections.push(currentSection);
      continue;
    }

    // Key: value header (only recognized before any bar line / section)
    const headerMatch = trimmed.match(/^(title|key|strum)\s*:\s*(.*)$/i);
    if (headerMatch && sections.length === 0 && currentSection === null) {
      const [, k, v] = headerMatch;
      const kl = k.toLowerCase();
      if (kl === 'title') title = v;
      else if (kl === 'key') {
        if (NOTES.includes(v as NoteName)) key = v as NoteName;
        else errors.push({ line: lineNo, message: `Unknown key "${v}" (use ${NOTES.join('/')})` });
      } else if (kl === 'strum') strum = v;
      continue;
    }

    // Bar line: bars separated by `|`, then ` @ 1 3m 6m 4`
    const atIdx = trimmed.lastIndexOf('@');
    if (atIdx === -1) {
      errors.push({ line: lineNo, message: `Missing "@ <degrees>" suffix` });
      continue;
    }
    const barsPart = trimmed.slice(0, atIdx).trim();
    const degPart = trimmed.slice(atIdx + 1).trim();

    const barSources = barsPart.split('|').map((s) => s.trim());
    const degTokens = degPart.split(/\s+/).filter(Boolean);

    if (barSources.length !== degTokens.length) {
      errors.push({
        line: lineNo,
        message: `Bar count (${barSources.length}) != degree count (${degTokens.length})`,
      });
      continue;
    }

    const bars: Bar[] = [];
    let barError = false;
    for (let bi = 0; bi < barSources.length; bi++) {
      const degree = parseDegreeToken(degTokens[bi]);
      if (degree == null) {
        errors.push({ line: lineNo, message: `Invalid degree "${degTokens[bi]}" (expected 1-6 with optional m)` });
        barError = true;
        break;
      }
      bars.push({ degree, source: barSources[bi] });
    }
    if (barError) continue;

    ensureSection().lines.push({ bars });
  }

  if (!title.trim()) {
    errors.push({ line: 0, message: 'Missing "title:" header' });
  }

  if (sections.length === 0) {
    errors.push({ line: 0, message: 'No bar lines found' });
  }

  const sheet: SongSheet | null =
    title.trim() && sections.length > 0
      ? {
          id: slugify(title),
          title: title.trim(),
          key,
          strum,
          sections,
        }
      : null;

  return { sheet, errors };
}

/**
 * Inverse of parseSongSheetText — produce a canonical editable text with YAML frontmatter.
 */
export function serializeSongSheet(sheet: SongSheet): string {
  const lines: string[] = [];
  lines.push('---');
  lines.push(`title: ${sheet.title}`);
  lines.push(`key: ${sheet.key}`);
  if (sheet.strum) lines.push(`strum: ${sheet.strum}`);
  lines.push('---');
  lines.push('');

  for (const section of sheet.sections) {
    lines.push(`--- ${section.name ?? ''} ---`);
    for (const line of section.lines) {
      const bars = line.bars.map((b) => b.source).join(' | ');
      const degs = line.bars
        .map((b) => {
          const suffix = [2, 3, 6].includes(b.degree) ? 'm' : '';
          return `${b.degree}${suffix}`;
        })
        .join(' ');
      lines.push(`${bars} @ ${degs}`);
    }
    lines.push('');
  }

  return (
    lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n'
  );
}
