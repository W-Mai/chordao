import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
 * Render a single bar cell as a trapezoid:
 *
 * ```
 *   [ chip ][ chip ][ chip ]       ← row 1, chips span their chord's char range
 *     字 字 字 字 字 字 字 字        ← row 2, one grid column per char (1fr)
 * ```
 *
 * The chip's bottom edge touches the accent char's top edge (no gap, shared degree color),
 * so visually it reads as one piece — not two separated boxes.
 */
function BarCell({
  bar,
  label,
  activeChordKey,
  keyOfDegree,
  handleHoverChord,
  handleClickChord,
  handleDblClickChord,
  fontSize,
}: {
  bar: Bar;
  label: (degree: number) => string;
  activeChordKey: string | null;
  keyOfDegree: (degree: number) => string | null;
  handleHoverChord: (k: string | null) => void;
  handleClickChord: (k: string) => void;
  handleDblClickChord: (k: string) => void;
  fontSize: number;
}) {
  // Flatten every chord's chars into a single ordered stream, tracking which chord owns each char.
  type LyricAtom = { ch: string; accent: boolean; chordIdx: number };
  const atoms: LyricAtom[] = [];
  bar.chords.forEach((chord, ci) => {
    for (const a of parseBarSource(chord.source).chars) {
      atoms.push({ ...a, chordIdx: ci });
    }
  });

  // For each chord, find the column where its chip should start.
  // Prefer the chord's first accent char; fall back to first owned char.
  const chordStartCol: number[] = bar.chords.map((_, ci) => {
    const firstAccent = atoms.findIndex((a) => a.chordIdx === ci && a.accent);
    if (firstAccent >= 0) return firstAccent;
    const firstOwned = atoms.findIndex((a) => a.chordIdx === ci);
    return firstOwned >= 0 ? firstOwned : 0;
  });

  const cols = Math.max(1, atoms.length);

  return (
    <div
      className="grid min-w-0"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: 'auto auto',
        fontSize: `${fontSize}px`,
        lineHeight: 1.2,
      }}
    >
      {/* Chord chips — each spans from its start column to just before the next chord's start */}
      {bar.chords.map((chord, ci) => {
        const startCol = chordStartCol[ci];
        const endCol = ci + 1 < bar.chords.length ? chordStartCol[ci + 1] : cols;
        const vKey = keyOfDegree(chord.degree);
        const isActive = vKey != null && vKey === activeChordKey;
        const color = `var(--color-deg-${chord.degree})`;
        return (
          <button
            key={`chip-${ci}`}
            onClick={() => vKey && handleClickChord(vKey)}
            onDoubleClick={() => vKey && handleDblClickChord(vKey)}
            onPointerEnter={() => vKey && handleHoverChord(vKey)}
            onPointerLeave={() => handleHoverChord(null)}
            className="text-left text-xs font-mono px-1 py-0.5 cursor-pointer"
            style={{
              gridRow: 1,
              gridColumn: `${startCol + 1} / ${endCol + 1}`,
              background: isActive ? color : `color-mix(in srgb, ${color} 20%, transparent)`,
              color: isActive ? 'var(--crust)' : color,
              fontWeight: isActive ? 700 : 500,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              transition: 'all var(--transition)',
            }}
          >
            {label(chord.degree)}
          </button>
        );
      })}

      {/* Lyric chars — one grid column each. Accent chars share the degree color
          as a continuous band that visually connects to the chip above. */}
      {atoms.map((a, i) => {
        const color = `var(--color-deg-${bar.chords[a.chordIdx].degree})`;
        const isLastInChord = i + 1 >= atoms.length || atoms[i + 1].chordIdx !== a.chordIdx;
        const isFirstInChord = i === 0 || atoms[i - 1].chordIdx !== a.chordIdx;
        if (a.accent) {
          return (
            <span
              key={`lyr-${i}`}
              style={{
                gridRow: 2,
                gridColumn: `${i + 1}`,
                background: `color-mix(in srgb, ${color} 30%, transparent)`,
                color,
                fontWeight: 700,
                display: 'inline-flex',
                justifyContent: 'center',
                borderBottomLeftRadius: isFirstInChord ? 2 : 0,
                borderBottomRightRadius: isLastInChord ? 2 : 0,
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

  // For each section × bar index, find the line that has the most chars — that's
  // the "hardest" cell for this bar slot. Font size per bar follows this max so
  // accent positions align vertically across lines in the same section.
  const sectionBarMaxChars = useMemo(() => {
    return sheet.sections.map((section) => {
      const maxPerBar: number[] = [];
      for (const line of section.lines) {
        line.bars.forEach((bar, bi) => {
          const n = barCharCount(bar);
          if (n > (maxPerBar[bi] ?? 0)) maxPerBar[bi] = n;
        });
      }
      return maxPerBar;
    });
  }, [sheet]);

  // Base font size: the biggest the sheet could tolerate if every bar had the
  // largest "max chars" we saw anywhere. Each bar's actual size gets scaled
  // relative to its section×bar-slot worst line.
  const baseFontSize = useMemo(() => {
    if (bodyWidth === 0) return 16;
    const barsPerLine = Math.max(1, sheet.sections[0]?.lines[0]?.bars.length ?? 4);
    const globalMax = sectionBarMaxChars.reduce((m, row) => {
      const rowMax = row.reduce((mm, n) => Math.max(mm, n || 0), 0);
      return Math.max(m, rowMax);
    }, 1);
    // Available width per bar (minus a little for gaps)
    const perBar = Math.max(40, bodyWidth / barsPerLine - 8);
    const raw = perBar / (globalMax * CH_EM);
    return Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, raw));
  }, [bodyWidth, sheet, sectionBarMaxChars]);

  // Font size for a given section × bar index. If that slot's worst line is the
  // one driving baseFontSize, we get baseFontSize. Otherwise we scale up — but
  // CAP at the base so we don't accidentally go bigger than the sheet's baseline.
  // (A per-bar cap keeps accent positions aligned across lines inside a section.)
  const fontSizeForBar = (sectionIdx: number, barIdx: number, thisBarChars: number): number => {
    const slotMax = sectionBarMaxChars[sectionIdx]?.[barIdx] ?? thisBarChars;
    // The slot's worst line would render at baseFontSize; other lines match to stay aligned.
    // Scale up only if this bar is *shorter* than the slot max would be the norm.
    // Actually we want the accents to stay on the same column, so ALL lines in this slot
    // must use the SAME font size — that of the slot's worst line.
    void thisBarChars;
    // Slot font size = base × (globalMax / slotMax). If the slot is less crowded than the
    // globalMax, we can scale up proportionally. Clamp to [MIN, MAX].
    const globalMax = sectionBarMaxChars.reduce((m, row) => {
      const rowMax = row.reduce((mm, n) => Math.max(mm, n || 0), 0);
      return Math.max(m, rowMax);
    }, 1);
    const slotScaled = baseFontSize * (globalMax / Math.max(1, slotMax));
    return Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, slotScaled));
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
            {section.lines.map((line, li) => {
              const bars = line.bars;
              return (
                <div
                  key={li}
                  className="grid gap-1 mb-2 leading-relaxed"
                  style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
                >
                  {bars.map((bar, bi) => (
                    <BarCell
                      key={bi}
                      bar={bar}
                      label={label}
                      activeChordKey={activeChordKey}
                      keyOfDegree={keyOfDegree}
                      handleHoverChord={handleHoverChord}
                      handleClickChord={handleClickChord}
                      handleDblClickChord={handleDblClickChord}
                      fontSize={fontSizeForBar(si, bi, barCharCount(bar))}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
