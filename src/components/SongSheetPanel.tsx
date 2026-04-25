import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NOTE_DISPLAY, NOTES, type NoteName, type ChordVoicing, voicingKey } from '../data/chordData';
import type { SongSheet, Bar } from '../data/songSheet';
import { parseBarSource } from '../data/songSheet';

/** Approx per-char em factor in a monospace CJK-heavy font. Tuned empirically. */
const CH_EM = 1.1;
const MIN_FONT_PX = 12;
const MAX_FONT_PX = 28;

/** Count rendered chars in a bar (sum over chords, sans [] markers). */
function barCharCount(bar: Bar): number {
  return bar.chords.reduce((n, c) => n + parseBarSource(c.source).chars.length, 0);
}

const DEGREE_INTERVAL: Record<number, number> = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9 };
const DEGREE_SUFFIX: Record<number, string> = { 1: '', 2: 'm', 3: 'm', 4: '', 5: '', 6: 'm' };
const DEGREE_LABEL: Record<number, string> = { 1: '1', 2: '2m', 3: '3m', 4: '4', 5: '5', 6: '6m' };

function noteIndex(n: NoteName): number {
  return NOTES.indexOf(n);
}

function absoluteChordName(key: NoteName, degree: number): string {
  const rootIdx = (noteIndex(key) + DEGREE_INTERVAL[degree]) % 12;
  const root = NOTES[rootIdx];
  return `${NOTE_DISPLAY[root]}${DEGREE_SUFFIX[degree]}`;
}

interface SongOption {
  id: string;
  title: string;
  group?: string;
}

interface SongSheetPanelProps {
  sheet: SongSheet;
  selectedKey: NoteName;
  optimal: ChordVoicing[];
  light: boolean;
  activeChordKey: string | null;
  handleHoverChord: (k: string | null) => void;
  handleClickChord: (k: string) => void;
  handleDblClickChord: (k: string) => void;
  chordNameMode: 'degree' | 'absolute';
  toggleChordNameMode: () => void;
  songOptions: SongOption[];
  currentSongId: string;
  onSelectSong: (id: string) => void;
  onNewSong?: () => void;
  onEditSong?: () => void;
  onClosePanel?: () => void;
  onExpand?: () => void;
}

/**
 * Render a single line of the sheet. A line is a single grid, one column per char
 * across ALL bars. This lets chord chips span across bar boundaries freely — a
 * chord's "territory" runs from its accent to the next chord's accent (even if
 * that next chord lives in a later bar). Bar boundaries are marked with thin
 * dividers as a separate overlay row.
 */
function LineRow({
  bars,
  label,
  activeChordKey,
  keyOfDegree,
  handleHoverChord,
  handleClickChord,
  handleDblClickChord,
  fontSize,
}: {
  bars: Bar[];
  label: (degree: number) => string;
  activeChordKey: string | null;
  keyOfDegree: (degree: number) => string | null;
  handleHoverChord: (k: string | null) => void;
  handleClickChord: (k: string) => void;
  handleDblClickChord: (k: string) => void;
  fontSize: number;
}) {
  // Flatten the whole line into one char stream, tagging each atom with its (barIdx, chordIdx).
  type LyricAtom = { ch: string; accent: boolean; barIdx: number; chordIdx: number };
  const atoms: LyricAtom[] = [];
  // Linear list of chords: {barIdx, chordIdx, degree, startCol, accentCol}
  // - startCol = where the chord's color band begins (for first-of-line, that's col 0)
  // - accentCol = where the chord's label should visually anchor (its first accent char)
  type ChordRef = { barIdx: number; chordIdx: number; degree: number; startCol: number; accentCol: number };
  const chords: ChordRef[] = [];
  const barStartCols: number[] = [];

  bars.forEach((bar, bi) => {
    barStartCols.push(atoms.length);
    bar.chords.forEach((chord, ci) => {
      const chars = parseBarSource(chord.source).chars;
      const baseCol = atoms.length;
      let accentOffset = chars.findIndex((c) => c.accent);
      if (accentOffset < 0) accentOffset = 0;
      const accentCol = baseCol + accentOffset;
      const isFirstChordOfLine = bi === 0 && ci === 0;
      const startCol = isFirstChordOfLine ? 0 : accentCol;
      chords.push({ barIdx: bi, chordIdx: ci, degree: chord.degree, startCol, accentCol });
      for (const ch of chars) atoms.push({ ...ch, barIdx: bi, chordIdx: ci });
    });
  });

  const cols = Math.max(1, atoms.length);

  return (
    <div
      className="grid min-w-0 mb-2 leading-relaxed"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: 'auto auto',
        fontSize: `${fontSize}px`,
        lineHeight: 1.2,
      }}
    >
      {/* Chord chips — background spans from startCol to next chord's startCol (or line end).
          The label text inside is anchored to the accent column so it sits right above
          the accent char in the lyric row. */}
      {chords.map((chord, ci) => {
        const endCol = ci + 1 < chords.length ? chords[ci + 1].startCol : cols;
        const vKey = keyOfDegree(chord.degree);
        const isActive = vKey != null && vKey === activeChordKey;
        const color = `var(--color-deg-${chord.degree})`;
        const bandWidth = endCol - chord.startCol;
        const accentOffsetPct = bandWidth > 0 ? ((chord.accentCol - chord.startCol) / bandWidth) * 100 : 0;
        return (
          <button
            key={`chip-${ci}`}
            onClick={() => vKey && handleClickChord(vKey)}
            onDoubleClick={() => vKey && handleDblClickChord(vKey)}
            onPointerEnter={() => vKey && handleHoverChord(vKey)}
            onPointerLeave={() => handleHoverChord(null)}
            className="text-left text-xs font-mono py-0.5 cursor-pointer relative"
            style={{
              gridRow: 1,
              gridColumn: `${chord.startCol + 1} / ${endCol + 1}`,
              background: isActive ? color : `color-mix(in srgb, ${color} 20%, transparent)`,
              color: isActive ? 'var(--crust)' : color,
              fontWeight: isActive ? 700 : 500,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              transition: 'all var(--transition)',
              padding: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: `${accentOffsetPct}%`,
                top: 0,
                bottom: 0,
                paddingLeft: 2,
                paddingRight: 2,
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {label(chord.degree)}
            </span>
          </button>
        );
      })}

      {/* Lyric chars — one grid column each. Accent cells share the degree color. */}
      {atoms.map((a, i) => {
        const color = `var(--color-deg-${bars[a.barIdx].chords[a.chordIdx].degree})`;
        const vKey = keyOfDegree(bars[a.barIdx].chords[a.chordIdx].degree);
        const isActive = vKey != null && vKey === activeChordKey;
        if (a.accent) {
          return (
            <span
              key={`lyr-${i}`}
              style={{
                gridRow: 2,
                gridColumn: `${i + 1}`,
                background: isActive ? color : `color-mix(in srgb, ${color} 20%, transparent)`,
                color: isActive ? 'var(--crust)' : color,
                fontWeight: 700,
                display: 'inline-flex',
                justifyContent: 'center',
                transition: 'all var(--transition)',
              }}
            >
              {a.ch === ' ' ? ' ' : a.ch}
            </span>
          );
        }
        return (
          <span
            key={`lyr-${i}`}
            style={{
              gridRow: 2,
              gridColumn: `${i + 1}`,
              color: 'var(--text)',
              opacity: 0.55,
              display: 'inline-flex',
              justifyContent: 'center',
            }}
          >
            {a.ch === ' ' ? ' ' : a.ch}
          </span>
        );
      })}

      {/* Bar dividers: thin vertical line at the start of each bar except the first. */}
      {barStartCols.slice(1).map((col, i) => (
        <div
          key={`div-${i}`}
          style={{
            gridRow: '1 / span 2',
            gridColumn: `${col + 1}`,
            borderLeft: '1px dashed var(--surface0)',
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  );
}

function ExpandBtn({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-2 py-1 rounded border border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer transition-all"
      style={{ transition: 'all var(--transition)' }}
      title={title}
    >
      {'⛶'}
    </button>
  );
}

export function SongSheetPanel({
  sheet,
  selectedKey,
  optimal,
  activeChordKey,
  handleHoverChord,
  handleClickChord,
  handleDblClickChord,
  chordNameMode,
  toggleChordNameMode,
  songOptions,
  currentSongId,
  onSelectSong,
  onNewSong,
  onEditSong,
  onClosePanel,
  onExpand,
}: SongSheetPanelProps) {
  const { t } = useTranslation();

  const keyOfDegree = (degree: number): string | null => {
    const v = optimal.find((o) => o.degree === degree);
    return v ? voicingKey(v) : null;
  };

  const label = (degree: number) =>
    chordNameMode === 'absolute' ? absoluteChordName(selectedKey, degree) : DEGREE_LABEL[degree];

  // Measure the body's width so we can auto-size the font to fill a line.
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyWidth, setBodyWidth] = useState(0);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const update = () => setBodyWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Font size per line: make each line fill the panel width.
  // n = total chars in the line (summed across all bars).
  const lineFontSize = (line: import('../data/songSheet').Line): number => {
    if (bodyWidth === 0) return 16;
    const n = line.bars.reduce((sum, bar) => sum + barCharCount(bar), 0);
    if (n === 0) return 16;
    const raw = bodyWidth / (n * CH_EM);
    return Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, raw));
  };

  // Silence unused-import warnings when the hook isn't tree-shaken out
  void useEffect;

  return (
    <section className="panel mb-2 md:mb-6 w-full">
      <div className="panel-header">
        <span className="panel-title flex items-center gap-1 flex-1 min-w-0">
          <span>{'🎼'}</span>
          <select
            value={currentSongId}
            onChange={(e) => onSelectSong(e.target.value)}
            className="bg-transparent text-txt text-[13px] font-semibold cursor-pointer outline-none border-0 max-w-full truncate hover:text-blue"
            style={{ transition: 'color var(--transition)' }}
            title={t('songSelectTitle')}
          >
            {songOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.title}
                {opt.group === 'user' ? ` (${t('songUser')})` : ''}
              </option>
            ))}
          </select>
        </span>
        <button
          onClick={toggleChordNameMode}
          className="text-[10px] px-2 h-5 rounded-full cursor-pointer bg-surface0 text-overlay1 mr-1 flex items-center"
          style={{ transition: 'all var(--transition)' }}
          title={t('songChordNameToggle')}
        >
          {chordNameMode === 'degree' ? t('songModeDegree') : t('songModeAbs')}
        </button>
        {onNewSong && (
          <button
            onClick={onNewSong}
            className="text-[10px] px-2 h-5 rounded cursor-pointer bg-surface0 text-overlay1 hover:text-blue mr-1"
            style={{ transition: 'all var(--transition)' }}
            title={t('songEditorOpenNew')}
          >
            {t('songEditorOpenNew')}
          </button>
        )}
        {onEditSong && (
          <button
            onClick={onEditSong}
            className="text-[10px] px-2 h-5 rounded cursor-pointer bg-surface0 text-overlay1 hover:text-blue mr-1"
            style={{ transition: 'all var(--transition)' }}
            title={t('songEditorOpenEdit')}
          >
            {t('songEditorOpenEdit')}
          </button>
        )}
        {onExpand && <ExpandBtn onClick={onExpand} title={t('expand')} />}
        {onClosePanel && (
          <button
            onClick={onClosePanel}
            className="text-xs px-2 py-1 rounded border border-surface0 text-overlay1 hover:text-red hover:border-red cursor-pointer ml-1"
            style={{ transition: 'all var(--transition)' }}
            title={t('close')}
          >
            {'✕'}
          </button>
        )}
      </div>
      <div className="panel-body" ref={bodyRef}>
        {sheet.strum && <div className="font-mono text-sm mb-3 text-subtext0">{sheet.strum}</div>}
        {sheet.sections.map((section, si) => (
          <div key={si} className="mb-4 font-mono">
            {section.name && (
              <div className="text-[10px] uppercase tracking-wide text-overlay0 mb-1">[{section.name}]</div>
            )}
            {section.lines.map((line, li) => (
              <LineRow
                key={li}
                bars={line.bars}
                label={label}
                activeChordKey={activeChordKey}
                keyOfDegree={keyOfDegree}
                handleHoverChord={handleHoverChord}
                handleClickChord={handleClickChord}
                handleDblClickChord={handleDblClickChord}
                fontSize={lineFontSize(line)}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
