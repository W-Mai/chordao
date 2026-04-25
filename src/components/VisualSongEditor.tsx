import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SongSheet, Section, Line, Bar, Chord, TimeSig } from '../data/songSheet';
import { NOTES, type NoteName } from '../data/chordData';
import { RHYTHM_PATTERNS } from '../utils/audio';

const DEGREE_LABEL: Record<number, string> = { 1: '1', 2: '2m', 3: '3m', 4: '4', 5: '5', 6: '6m' };
const ALL_DEGREES = [1, 2, 3, 4, 5, 6];

interface VisualSongEditorProps {
  sheet: SongSheet;
  onChange: (next: SongSheet) => void;
}

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

/** Find accent-run starts within a sub-range of atoms. */
function accentRunStarts(atoms: CharAtom[], from: number, to: number): number[] {
  const starts: number[] = [];
  let inRun = false;
  for (let i = from; i < to; i++) {
    if (atoms[i].accent && !inRun) {
      starts.push(i);
      inRun = true;
    } else if (!atoms[i].accent) {
      inRun = false;
    }
  }
  return starts;
}

/** Render a range of atoms back into a source string with [] around accent runs. */
function sourceFromRange(atoms: CharAtom[], from: number, to: number): string {
  let out = '';
  let prevAccent = false;
  for (let i = from; i < to; i++) {
    const a = atoms[i];
    if (a.accent && !prevAccent) out += '[';
    if (!a.accent && prevAccent) out += ']';
    out += a.ch;
    prevAccent = a.accent;
  }
  if (prevAccent) out += ']';
  return out;
}

/**
 * Per-line flat representation used only during editing:
 * - atoms: every character in the line as { ch, accent }
 * - barStarts: atom index where each bar starts (length = bar count)
 * - barDegreesList[i]: degrees array for bar i; its length is allowed to drift
 *   temporarily but normalized to match accent runs on commit.
 */
interface FlatLine {
  atoms: CharAtom[];
  barStarts: number[];
  barDegreesList: number[][];
}

function flattenLine(line: Line): FlatLine {
  const atoms: CharAtom[] = [];
  const barStarts: number[] = [];
  const barDegreesList: number[][] = [];
  for (const bar of line.bars) {
    barStarts.push(atoms.length);
    barDegreesList.push(bar.chords.map((c) => c.degree));
    for (const chord of bar.chords) {
      for (const a of atomsFromSource(chord.source)) atoms.push(a);
    }
  }
  return { atoms, barStarts, barDegreesList };
}

function unflattenLine(flat: FlatLine): Line {
  const bars: Bar[] = [];
  const barCount = flat.barStarts.length;
  for (let bi = 0; bi < barCount; bi++) {
    const start = flat.barStarts[bi];
    const end = bi + 1 < barCount ? flat.barStarts[bi + 1] : flat.atoms.length;
    const degrees = flat.barDegreesList[bi];
    const starts = accentRunStarts(flat.atoms, start, end);

    // Chord count should equal accent-run count. If mismatched, pad or truncate
    // degrees; prefer keeping the leading degrees user typed.
    const chordCount = Math.max(1, starts.length || 1);
    const chords: Chord[] = [];

    if (starts.length === 0) {
      // No accent run — one chord containing the full segment.
      const deg = degrees[0] ?? 1;
      chords.push({ degree: deg, source: sourceFromRange(flat.atoms, start, end) });
    } else {
      for (let ci = 0; ci < chordCount; ci++) {
        const from = starts[ci];
        const to = ci + 1 < starts.length ? starts[ci + 1] : end;
        const deg = degrees[ci] ?? degrees[degrees.length - 1] ?? 1;
        chords.push({ degree: deg, source: sourceFromRange(flat.atoms, from, to) });
      }
      // If the first accent run doesn't start at `start`, prepend that lyric
      // prefix onto the first chord so we don't drop it.
      if (starts[0] > start) {
        const prefix = sourceFromRange(flat.atoms, start, starts[0]);
        chords[0] = { ...chords[0], source: prefix + chords[0].source };
      }
    }
    bars.push({ chords });
  }
  return { bars };
}

export function VisualSongEditor({ sheet, onChange }: VisualSongEditorProps) {
  const { t } = useTranslation();
  const [degreePicker, setDegreePicker] = useState<{
    sectionIdx: number;
    lineIdx: number;
    barIdx: number;
    chordIdx: number;
  } | null>(null);

  const updateMeta = useCallback(
    (patch: Partial<Pick<SongSheet, 'title' | 'key' | 'strum' | 'bpm' | 'timeSig'>>) => {
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

  const makeEmptyBar = (d: number): Bar => ({ chords: [{ degree: d, source: '' }] });

  const addSection = useCallback(() => {
    const sections: Section[] = [...sheet.sections, { name: '', lines: [{ bars: [1, 1, 1, 1].map(makeEmptyBar) }] }];
    onChange({ ...sheet, sections });
  }, [sheet, onChange]);

  const addLine = useCallback(
    (sectionIdx: number) => {
      const sections = sheet.sections.map((s, si) =>
        si !== sectionIdx ? s : { ...s, lines: [...s.lines, { bars: [1, 1, 1, 1].map(makeEmptyBar) }] },
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
        <label className="text-xs text-overlay0">{t('songEditorBpmField')}</label>
        <input
          type="number"
          min={30}
          max={300}
          value={sheet.bpm ?? ''}
          placeholder={t('songEditorBpmPlaceholder')}
          onChange={(e) => {
            const n = Number(e.target.value);
            updateMeta({ bpm: e.target.value === '' || !Number.isFinite(n) || n <= 0 ? undefined : n });
          }}
          className="w-20 bg-base border border-surface0 rounded px-2 py-1 text-sm text-txt outline-none focus:border-blue"
        />
        <label className="text-xs text-overlay0">{t('songEditorTimeSigField')}</label>
        <select
          value={sheet.timeSig ? `${sheet.timeSig.beats}/${sheet.timeSig.unit}` : ''}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return updateMeta({ timeSig: undefined });
            const [b, u] = v.split('/').map(Number);
            const ts: TimeSig = { beats: b, unit: u };
            updateMeta({ timeSig: ts });
          }}
          className="bg-base border border-surface0 rounded px-2 py-1 text-sm text-txt outline-none focus:border-blue cursor-pointer"
        >
          <option value={''}>{'4/4'}</option>
          {['2/4', '3/4', '6/8', '9/8', '12/8'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {sheet.sections.map((section, si) => (
        <div key={si} className="border border-surface0 rounded-lg p-3 bg-base/40">
          <div className="flex items-center gap-2 mb-2">
            <input
              value={section.name ?? ''}
              onChange={(e) => updateSection(si, { name: e.target.value || undefined })}
              placeholder={t('songEditorSectionPlaceholder')}
              className="flex-1 bg-transparent border-b border-surface0 text-sm text-txt outline-none focus:border-blue"
            />
            <select
              value={section.strum ?? ''}
              onChange={(e) => updateSection(si, { strum: e.target.value || undefined })}
              title={t('songEditorSectionStrumTitle')}
              className="bg-base border border-surface0 rounded px-1.5 py-0.5 text-[11px] text-overlay1 outline-none focus:border-blue cursor-pointer"
            >
              <option value={''}>{t('songEditorSectionStrumDefault')}</option>
              {RHYTHM_PATTERNS.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.label}
                </option>
              ))}
            </select>
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
              onOpenDegreePicker={(barIdx, chordIdx) =>
                setDegreePicker({ sectionIdx: si, lineIdx: li, barIdx, chordIdx })
              }
              degreePickerOpen={
                degreePicker?.sectionIdx === si && degreePicker?.lineIdx === li
                  ? { barIdx: degreePicker.barIdx, chordIdx: degreePicker.chordIdx }
                  : null
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
  onOpenDegreePicker: (barIdx: number, chordIdx: number) => void;
  degreePickerOpen: { barIdx: number; chordIdx: number } | null;
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
  const { t } = useTranslation();
  const flat = useMemo(() => flattenLine(line), [line]);

  const commit = useCallback((next: FlatLine) => onChange(unflattenLine(next)), [onChange]);

  const setDegree = useCallback(
    (barIdx: number, chordIdx: number, degree: number) => {
      const barDegreesList = flat.barDegreesList.map((list, bi) =>
        bi !== barIdx ? list : list.map((d, ci) => (ci !== chordIdx ? d : degree)),
      );
      commit({ ...flat, barDegreesList });
      closeDegreePicker();
    },
    [flat, commit, closeDegreePicker],
  );

  const toggleAccentAtAtom = useCallback(
    (atomIdx: number) => {
      const atoms = flat.atoms.map((a, i) => (i === atomIdx ? { ...a, accent: !a.accent } : a));
      // Accent runs changed → chord count in the owning bar needs to be re-synced.
      // Find which bar this atom belongs to.
      let targetBar = 0;
      for (let bi = 0; bi < flat.barStarts.length; bi++) {
        if (atomIdx >= flat.barStarts[bi]) targetBar = bi;
        else break;
      }
      const start = flat.barStarts[targetBar];
      const end = targetBar + 1 < flat.barStarts.length ? flat.barStarts[targetBar + 1] : atoms.length;
      const runs = accentRunStarts(atoms, start, end);
      const desiredChords = Math.max(1, runs.length || 1);
      const cur = flat.barDegreesList[targetBar];
      const nextList = cur.slice(0, desiredChords);
      while (nextList.length < desiredChords) nextList.push(cur[cur.length - 1] ?? 1);
      const barDegreesList = flat.barDegreesList.map((list, bi) => (bi !== targetBar ? list : nextList));
      commit({ ...flat, atoms, barDegreesList });
    },
    [flat, commit],
  );

  const addBar = useCallback(() => {
    const lastBarDegs = flat.barDegreesList[flat.barDegreesList.length - 1];
    const newDeg = lastBarDegs?.[lastBarDegs.length - 1] ?? 1;
    commit({
      ...flat,
      barStarts: [...flat.barStarts, flat.atoms.length],
      barDegreesList: [...flat.barDegreesList, [newDeg]],
    });
  }, [flat, commit]);

  const removeBar = useCallback(() => {
    if (flat.barStarts.length <= 1) return;
    const lastStart = flat.barStarts[flat.barStarts.length - 1];
    commit({
      atoms: flat.atoms.slice(0, lastStart),
      barStarts: flat.barStarts.slice(0, -1),
      barDegreesList: flat.barDegreesList.slice(0, -1),
    });
  }, [flat, commit]);

  const editBarText = useCallback(
    (barIdx: number, text: string) => {
      const start = flat.barStarts[barIdx];
      const end = barIdx + 1 < flat.barStarts.length ? flat.barStarts[barIdx + 1] : flat.atoms.length;
      const newAtoms = Array.from(text).map((ch) => ({ ch, accent: false }));
      const nextAtoms = [...flat.atoms.slice(0, start), ...newAtoms, ...flat.atoms.slice(end)];
      const delta = newAtoms.length - (end - start);
      const barStarts = flat.barStarts.map((b, i) => (i <= barIdx ? b : b + delta));
      // Accents cleared in this bar → 1 chord only (keep first degree).
      const cur = flat.barDegreesList[barIdx];
      const barDegreesList = flat.barDegreesList.map((list, bi) => (bi !== barIdx ? list : [cur[0] ?? 1]));
      commit({ atoms: nextAtoms, barStarts, barDegreesList });
    },
    [flat, commit],
  );

  const barCount = flat.barStarts.length;

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
        <div className="flex items-center gap-1 mb-1 justify-end">
          <button
            onClick={removeBar}
            disabled={barCount <= 1}
            className="text-[10px] px-1.5 py-0.5 rounded cursor-pointer bg-surface0 text-overlay1 hover:text-red disabled:opacity-30 disabled:cursor-not-allowed"
            title={t('songEditorRemoveBar')}
          >
            {t('songEditorRemoveBar')}
          </button>
          <button
            onClick={addBar}
            className="text-[10px] px-1.5 py-0.5 rounded cursor-pointer bg-surface0 text-overlay1 hover:text-blue"
            title={t('songEditorAddBar')}
          >
            {t('songEditorAddBar')}
          </button>
        </div>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${barCount}, minmax(0, 1fr))` }}>
          {flat.barDegreesList.map((degrees, bi) => {
            const start = flat.barStarts[bi];
            const end = bi + 1 < flat.barStarts.length ? flat.barStarts[bi + 1] : flat.atoms.length;
            return (
              <div
                key={bi}
                className="grid gap-0.5"
                style={{ gridTemplateColumns: `repeat(${degrees.length}, minmax(0, 1fr))` }}
              >
                {/* Chord chips (one per chord in this bar) */}
                {degrees.map((degree, ci) => {
                  const color = `var(--color-deg-${degree})`;
                  const isOpen = degreePickerOpen?.barIdx === bi && degreePickerOpen?.chordIdx === ci;
                  return (
                    <div key={`h-${ci}`} className="relative">
                      <button
                        onClick={() => onOpenDegreePicker(bi, ci)}
                        className="w-full text-left text-xs font-mono px-1 py-0.5 rounded cursor-pointer"
                        style={{
                          background: `color-mix(in srgb, ${color} 20%, transparent)`,
                          color,
                          fontWeight: 500,
                        }}
                      >
                        {DEGREE_LABEL[degree]}
                      </button>
                      {isOpen && (
                        <DegreePopover
                          current={degree}
                          onPick={(d) => setDegree(bi, ci, d)}
                          onCancel={closeDegreePicker}
                        />
                      )}
                    </div>
                  );
                })}
                {/* Bar body: atoms spanning all chords in this bar.
                    Accent toggles split chords automatically. */}
                <div style={{ gridColumn: `span ${degrees.length}` }}>
                  <BarBody
                    atoms={flat.atoms.slice(start, end)}
                    atomOffset={start}
                    onToggleAccent={toggleAccentAtAtom}
                    onReplaceText={(txt) => editBarText(bi, txt)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface BarBodyProps {
  atoms: CharAtom[];
  atomOffset: number;
  onToggleAccent: (globalIdx: number) => void;
  onReplaceText: (text: string) => void;
}

function BarBody({ atoms, atomOffset, onToggleAccent, onReplaceText }: BarBodyProps) {
  const { t } = useTranslation();
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
        className="text-sm bg-base border border-blue rounded px-1 outline-none text-txt w-full"
      />
    );
  }

  return (
    <div className="text-sm relative" onDoubleClick={startEditing} title="double-click to edit">
      {atoms.length === 0 ? (
        <span className="text-overlay0 italic opacity-50">{t('songEditorEmptyBarHint')}</span>
      ) : (
        atoms.map((a, i) => {
          const degCandidate = 1; // color isn't known at atom level; use a neutral accent style
          void degCandidate;
          return (
            <span
              key={i}
              onClick={() => onToggleAccent(atomOffset + i)}
              className="cursor-pointer select-none"
              style={
                a.accent
                  ? {
                      background: `color-mix(in srgb, var(--blue) 30%, transparent)`,
                      color: 'var(--blue)',
                      fontWeight: 700,
                      padding: '0 1px',
                      borderRadius: 2,
                    }
                  : {}
              }
            >
              {a.ch === ' ' ? ' ' : a.ch}
            </span>
          );
        })
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
