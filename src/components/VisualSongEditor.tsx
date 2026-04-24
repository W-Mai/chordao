import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SongSheet, Section, Line, Bar } from '../data/songSheet';
import { NOTES, type NoteName } from '../data/chordData';

const DEGREE_LABEL: Record<number, string> = { 1: '1', 2: '2m', 3: '3m', 4: '4', 5: '5', 6: '6m' };
const ALL_DEGREES = [1, 2, 3, 4, 5, 6];

interface VisualSongEditorProps {
  sheet: SongSheet;
  onChange: (next: SongSheet) => void;
}

/**
 * Parsed bar source → array of {ch, accent} atoms. Accents are characters
 * that sat inside [X] brackets in the original string.
 */
interface CharAtom {
  ch: string;
  accent: boolean;
}

function atomsFromSource(source: string): CharAtom[] {
  const out: CharAtom[] = [];
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
    out.push({ ch, accent: inBracket });
  }
  return out;
}

function sourceFromAtoms(atoms: CharAtom[]): string {
  // Re-wrap contiguous accent runs in [..] brackets.
  let out = '';
  let prevAccent = false;
  for (const a of atoms) {
    if (a.accent && !prevAccent) out += '[';
    if (!a.accent && prevAccent) out += ']';
    out += a.ch;
    prevAccent = a.accent;
  }
  if (prevAccent) out += ']';
  return out;
}

/**
 * A line is a set of bars. For visual editing we flatten into a single atom
 * stream + bar boundaries. boundary[i] = atom index where bar i starts.
 * len(atoms) is implicit end of the last bar.
 */
interface FlatLine {
  atoms: CharAtom[];
  degrees: number[]; // length = boundaries.length
  boundaries: number[]; // length = degrees.length; always starts with 0
}

function flattenLine(line: Line): FlatLine {
  const atoms: CharAtom[] = [];
  const boundaries: number[] = [];
  const degrees: number[] = [];
  for (const bar of line.bars) {
    boundaries.push(atoms.length);
    degrees.push(bar.degree);
    for (const a of atomsFromSource(bar.source)) atoms.push(a);
  }
  return { atoms, degrees, boundaries };
}

function unflattenLine(flat: FlatLine): Line {
  const bars: Bar[] = [];
  for (let i = 0; i < flat.boundaries.length; i++) {
    const start = flat.boundaries[i];
    const end = i + 1 < flat.boundaries.length ? flat.boundaries[i + 1] : flat.atoms.length;
    bars.push({ degree: flat.degrees[i], source: sourceFromAtoms(flat.atoms.slice(start, end)) });
  }
  return { bars };
}

export function VisualSongEditor({ sheet, onChange }: VisualSongEditorProps) {
  const { t } = useTranslation();
  // popover state: {path to bar, anchor}
  const [degreePicker, setDegreePicker] = useState<{ sectionIdx: number; lineIdx: number; barIdx: number } | null>(
    null,
  );

  const updateMeta = useCallback(
    (patch: Partial<Pick<SongSheet, 'title' | 'key' | 'strum'>>) => {
      onChange({ ...sheet, ...patch });
    },
    [sheet, onChange],
  );

  const updateLine = useCallback(
    (sectionIdx: number, lineIdx: number, next: Line) => {
      const sections = sheet.sections.map((s, si) =>
        si !== sectionIdx ? s : { ...s, lines: s.lines.map((l, li) => (li !== lineIdx ? l : next)) },
      );
      onChange({ ...sheet, sections });
    },
    [sheet, onChange],
  );

  const updateSection = useCallback(
    (sectionIdx: number, patch: Partial<Section>) => {
      const sections = sheet.sections.map((s, si) => (si !== sectionIdx ? s : { ...s, ...patch }));
      onChange({ ...sheet, sections });
    },
    [sheet, onChange],
  );

  const deleteSection = useCallback(
    (sectionIdx: number) => {
      const sections = sheet.sections.filter((_, si) => si !== sectionIdx);
      onChange({ ...sheet, sections });
    },
    [sheet, onChange],
  );

  const addSection = useCallback(() => {
    const sections = [
      ...sheet.sections,
      { name: '', lines: [{ bars: [1, 1, 1, 1].map((d) => ({ degree: d, source: '' })) }] } satisfies Section,
    ];
    onChange({ ...sheet, sections });
  }, [sheet, onChange]);

  const addLine = useCallback(
    (sectionIdx: number) => {
      const sections = sheet.sections.map((s, si) =>
        si !== sectionIdx
          ? s
          : { ...s, lines: [...s.lines, { bars: [1, 1, 1, 1].map((d) => ({ degree: d, source: '' })) }] },
      );
      onChange({ ...sheet, sections });
    },
    [sheet, onChange],
  );

  const deleteLine = useCallback(
    (sectionIdx: number, lineIdx: number) => {
      const sections = sheet.sections.map((s, si) =>
        si !== sectionIdx ? s : { ...s, lines: s.lines.filter((_, li) => li !== lineIdx) },
      );
      onChange({ ...sheet, sections });
    },
    [sheet, onChange],
  );

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Metadata row */}
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs text-overlay0">{t('songEditorTitleField')}</label>
        <input
          value={sheet.title}
          onChange={(e) => updateMeta({ title: e.target.value })}
          className="flex-1 min-w-[200px] bg-base border border-surface0 rounded px-2 py-1 text-sm text-txt outline-none focus:border-blue"
        />
        <label className="text-xs text-overlay0">{t('songEditorKeyField')}</label>
        <select
          value={sheet.key}
          onChange={(e) => updateMeta({ key: e.target.value as NoteName })}
          className="bg-base border border-surface0 rounded px-2 py-1 text-sm text-txt outline-none focus:border-blue cursor-pointer"
        >
          {NOTES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <label className="text-xs text-overlay0">{t('songEditorStrumField')}</label>
        <input
          value={sheet.strum ?? ''}
          onChange={(e) => updateMeta({ strum: e.target.value || undefined })}
          className="w-36 bg-base border border-surface0 rounded px-2 py-1 text-sm text-txt outline-none focus:border-blue font-mono"
        />
      </div>

      {/* Sections */}
      {sheet.sections.map((section, si) => (
        <div key={si} className="border border-surface0 rounded-lg p-3 bg-base/40">
          <div className="flex items-center gap-2 mb-2">
            <input
              value={section.name ?? ''}
              onChange={(e) => updateSection(si, { name: e.target.value || undefined })}
              placeholder={t('songEditorSectionPlaceholder')}
              className="flex-1 bg-transparent border-b border-surface0 text-sm text-txt outline-none focus:border-blue"
            />
            <button
              onClick={() => addLine(si)}
              className="text-[10px] px-2 py-0.5 rounded cursor-pointer bg-surface0 text-overlay1 hover:text-blue"
            >
              {t('songEditorAddLine')}
            </button>
            <button
              onClick={() => deleteSection(si)}
              className="text-[10px] px-2 py-0.5 rounded cursor-pointer bg-surface0 text-overlay1 hover:text-red"
            >
              {'×'}
            </button>
          </div>
          {section.lines.map((line, li) => (
            <LineEditor
              key={li}
              line={line}
              onChange={(next) => updateLine(si, li, next)}
              onDelete={() => deleteLine(si, li)}
              onOpenDegreePicker={(barIdx) => setDegreePicker({ sectionIdx: si, lineIdx: li, barIdx })}
              degreePickerOpen={
                degreePicker?.sectionIdx === si && degreePicker?.lineIdx === li ? degreePicker.barIdx : null
              }
              closeDegreePicker={() => setDegreePicker(null)}
            />
          ))}
        </div>
      ))}
      <div>
        <button
          onClick={addSection}
          className="text-xs px-3 py-1.5 rounded border border-dashed border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer w-full"
        >
          {t('songEditorAddSection')}
        </button>
      </div>
    </div>
  );
}

interface LineEditorProps {
  line: Line;
  onChange: (next: Line) => void;
  onDelete: () => void;
  onOpenDegreePicker: (barIdx: number) => void;
  degreePickerOpen: number | null;
  closeDegreePicker: () => void;
}

function LineEditor({
  line,
  onChange,
  onDelete,
  onOpenDegreePicker,
  degreePickerOpen,
  closeDegreePicker,
}: LineEditorProps) {
  const flat = useMemo(() => flattenLine(line), [line]);

  const commit = useCallback((next: FlatLine) => onChange(unflattenLine(next)), [onChange]);

  const setDegree = useCallback(
    (barIdx: number, degree: number) => {
      commit({ ...flat, degrees: flat.degrees.map((d, i) => (i === barIdx ? degree : d)) });
      closeDegreePicker();
    },
    [flat, commit, closeDegreePicker],
  );

  const toggleAccentAtAtom = useCallback(
    (atomIdx: number) => {
      const atoms = flat.atoms.map((a, i) => (i === atomIdx ? { ...a, accent: !a.accent } : a));
      commit({ ...flat, atoms });
    },
    [flat, commit],
  );

  const moveBoundary = useCallback(
    (barIdx: number, newAtomIdx: number) => {
      // Can't move the first boundary (always 0) or past previous/next boundary.
      if (barIdx <= 0) return;
      const lower = flat.boundaries[barIdx - 1] + 1; // at least 1 atom in prev bar
      const upper = barIdx + 1 < flat.boundaries.length ? flat.boundaries[barIdx + 1] - 1 : flat.atoms.length;
      const clamped = Math.max(lower, Math.min(upper, newAtomIdx));
      commit({ ...flat, boundaries: flat.boundaries.map((b, i) => (i === barIdx ? clamped : b)) });
    },
    [flat, commit],
  );

  const editSourceText = useCallback(
    (barIdx: number, text: string) => {
      // Rebuild atoms for this bar from scratch text (no accent markers — user is typing plain text).
      const start = flat.boundaries[barIdx];
      const end = barIdx + 1 < flat.boundaries.length ? flat.boundaries[barIdx + 1] : flat.atoms.length;
      const newAtoms = Array.from(text).map((ch) => ({ ch, accent: false }));
      const nextAtoms = [...flat.atoms.slice(0, start), ...newAtoms, ...flat.atoms.slice(end)];
      // Shift downstream boundaries by delta
      const delta = newAtoms.length - (end - start);
      const boundaries = flat.boundaries.map((b, i) => (i <= barIdx ? b : b + delta));
      commit({ ...flat, atoms: nextAtoms, boundaries });
    },
    [flat, commit],
  );

  const n = flat.degrees.length;

  return (
    <div className="relative flex items-start gap-2 mb-2">
      <button
        onClick={onDelete}
        className="text-[10px] w-5 h-5 shrink-0 rounded cursor-pointer text-overlay0 hover:text-red opacity-40 hover:opacity-100"
        title="delete line"
      >
        {'×'}
      </button>
      <div className="flex-1 min-w-0">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {flat.degrees.map((degree, bi) => {
            const color = `var(--color-deg-${degree})`;
            return (
              <div key={`h-${bi}`} className="relative">
                <button
                  onClick={() => onOpenDegreePicker(bi)}
                  className="w-full text-left text-xs font-mono px-1 py-0.5 rounded cursor-pointer"
                  style={{
                    background: `color-mix(in srgb, ${color} 20%, transparent)`,
                    color,
                    fontWeight: 500,
                  }}
                >
                  {DEGREE_LABEL[degree]}
                </button>
                {degreePickerOpen === bi && (
                  <DegreePopover current={degree} onPick={(d) => setDegree(bi, d)} onCancel={closeDegreePicker} />
                )}
              </div>
            );
          })}
          {flat.degrees.map((degree, bi) => {
            const start = flat.boundaries[bi];
            const end = bi + 1 < flat.boundaries.length ? flat.boundaries[bi + 1] : flat.atoms.length;
            return (
              <BarBody
                key={`l-${bi}`}
                degree={degree}
                atoms={flat.atoms.slice(start, end)}
                atomOffset={start}
                onToggleAccent={toggleAccentAtAtom}
                onReplaceText={(txt) => editSourceText(bi, txt)}
                leftDivider={bi > 0 ? () => (newIdx: number) => moveBoundary(bi, newIdx + start) : null}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface BarBodyProps {
  degree: number;
  atoms: CharAtom[];
  atomOffset: number;
  onToggleAccent: (globalIdx: number) => void;
  onReplaceText: (text: string) => void;
  leftDivider: (() => (newAtomIdx: number) => void) | null;
}

function BarBody({ degree, atoms, atomOffset, onToggleAccent, onReplaceText, leftDivider }: BarBodyProps) {
  const { t } = useTranslation();
  const color = `var(--color-deg-${degree})`;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEditing = () => {
    setDraft(atoms.map((a) => a.ch).join(''));
    setEditing(true);
  };
  const commitEdit = () => {
    onReplaceText(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitEdit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="text-sm bg-base border border-blue rounded px-1 outline-none text-txt"
      />
    );
  }

  return (
    <div className="text-sm relative group" onDoubleClick={startEditing} title="double-click to edit">
      {leftDivider && (
        <button
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue/50 z-10"
          title="drag to move bar boundary (left/right arrow after focus)"
          onKeyDown={(e) => {
            const move = leftDivider();
            if (e.key === 'ArrowLeft') move(-1);
            if (e.key === 'ArrowRight') move(+1);
          }}
        />
      )}
      {atoms.length === 0 ? (
        <span className="text-overlay0 italic opacity-50">{t('songEditorEmptyBarHint')}</span>
      ) : (
        atoms.map((a, i) => (
          <span
            key={i}
            onClick={() => onToggleAccent(atomOffset + i)}
            className="cursor-pointer select-none"
            style={
              a.accent
                ? {
                    background: `color-mix(in srgb, ${color} 30%, transparent)`,
                    color,
                    fontWeight: 700,
                    padding: '0 1px',
                    borderRadius: 2,
                  }
                : {}
            }
          >
            {a.ch === ' ' ? ' ' : a.ch}
          </span>
        ))
      )}
    </div>
  );
}

interface DegreePopoverProps {
  current: number;
  onPick: (d: number) => void;
  onCancel: () => void;
}

function DegreePopover({ current, onPick, onCancel }: DegreePopoverProps) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onCancel} />
      <div className="absolute top-full left-0 mt-1 z-30 flex gap-1 p-1.5 rounded-md border border-surface0 bg-mantle shadow-lg">
        {ALL_DEGREES.map((d) => {
          const color = `var(--color-deg-${d})`;
          return (
            <button
              key={d}
              onClick={() => onPick(d)}
              className="text-xs font-mono px-2 py-1 rounded cursor-pointer"
              style={{
                background: d === current ? color : `color-mix(in srgb, ${color} 20%, transparent)`,
                color: d === current ? 'var(--crust)' : color,
                fontWeight: d === current ? 700 : 500,
              }}
            >
              {DEGREE_LABEL[d]}
            </button>
          );
        })}
      </div>
    </>
  );
}
