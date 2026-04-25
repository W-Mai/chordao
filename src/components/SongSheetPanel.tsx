import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NOTE_DISPLAY, NOTES, type NoteName, type ChordVoicing, voicingKey } from '../data/chordData';
import type { SongSheet, Bar } from '../data/songSheet';
import { parseBarSource } from '../data/songSheet';

/** Approx per-char em factor in a monospace CJK-heavy font. Tuned empirically. */
const CH_EM = 1.1;
const MIN_FONT_PX = 12;
const MAX_FONT_PX = 28;

/**
 * Flatten a bar into `{ ch, accent }` atoms, preserving chord ownership.
 * The first accent char in each chord's source is the one the chord chip anchors to.
 */
interface BarAtom {
  ch: string;
  accent: boolean;
  chordIdx: number;
}
function barAtoms(bar: Bar): BarAtom[] {
  const out: BarAtom[] = [];
  bar.chords.forEach((chord, ci) => {
    for (const a of parseBarSource(chord.source).chars) {
      out.push({ ...a, chordIdx: ci });
    }
  });
  return out;
}

/**
 * Accent pattern of a single line-level bar: index positions (within the bar)
 * of each accent char, plus the total char count.
 *
 *   "我[那]些残[梦]" → { accents: [1, 4], total: 5 }
 */
interface BarAccentPattern {
  accents: number[];
  total: number;
}
function barAccentPattern(bar: Bar): BarAccentPattern {
  const atoms = barAtoms(bar);
  const accents: number[] = [];
  atoms.forEach((a, i) => {
    if (a.accent) accents.push(i);
  });
  return { accents, total: atoms.length };
}

/**
 * For a given bar slot in a section, compute the target column of each accent
 * so that lines with different prefix/gap lengths still land their k-th accent
 * on the same grid column. Non-accent chars fill sequentially and may leave
 * blank trailing columns when a line is shorter than the slot.
 *
 * Rules:
 *   accentCols[0]     = max over lines of (distance from bar start to 1st accent)
 *   accentCols[k]     = accentCols[k-1] + 1 + max over lines of gap_k
 *       where gap_k = (idx of accent k) - (idx of accent k-1) - 1
 *   totalCols         = max over lines of (their actual total chars, placed
 *                       against the computed accent cols)
 *
 * If a line has fewer accents than the slot max (can happen if multi-chord is
 * inconsistent across lines — uncommon), it falls back to natural placement
 * for any accents it does have.
 */
interface BarSlotLayout {
  accentCols: number[];
  totalCols: number;
}
function computeBarSlotLayout(barsInSlot: Bar[]): BarSlotLayout {
  if (barsInSlot.length === 0) return { accentCols: [], totalCols: 1 };
  const patterns = barsInSlot.map((b) => barAccentPattern(b));
  const numAccents = Math.max(...patterns.map((p) => p.accents.length));

  const accentCols: number[] = [];
  for (let k = 0; k < numAccents; k++) {
    if (k === 0) {
      // max prefix length across lines that actually have a 1st accent
      const maxPrefix = Math.max(0, ...patterns.filter((p) => p.accents.length > 0).map((p) => p.accents[0]));
      accentCols.push(maxPrefix);
    } else {
      const maxGap = Math.max(
        0,
        ...patterns.filter((p) => p.accents.length > k).map((p) => p.accents[k] - p.accents[k - 1] - 1),
      );
      accentCols.push(accentCols[k - 1] + 1 + maxGap);
    }
  }

  // Total cols: for each line, the max column it needs given the slot accentCols.
  // A line with accents at positions `a` and total length `T` places its tail
  // (chars after last accent) starting from accentCols[last]+1, needing
  // accentCols[last] + 1 + (T - lastAccentIdx - 1) columns.
  let totalCols = 1;
  patterns.forEach((p) => {
    if (p.accents.length === 0) {
      // No accents — just needs `p.total` cols starting from 0
      if (p.total > totalCols) totalCols = p.total;
      return;
    }
    const lastK = p.accents.length - 1;
    const tail = p.total - p.accents[lastK] - 1;
    const need = accentCols[lastK] + 1 + tail;
    if (need > totalCols) totalCols = need;

    // Also: lines whose leading prefix is shorter than accentCols[0] are OK
    // (they'll just have empty leading cells). But a line could have accentCols[0]
    // too large for its own prefix — that's fine, col computations below use
    // per-line offsets.
  });
  return { accentCols, totalCols: Math.max(1, totalCols) };
}

/**
 * Given a line's atoms + its slot layout, compute the absolute column of each atom.
 * This uses the same rule as computeBarSlotLayout so accents land on accentCols.
 */
function placeAtomsInSlot(atoms: BarAtom[], layout: BarSlotLayout): number[] {
  const cols: number[] = new Array(atoms.length);
  const accentIdxInLine: number[] = [];
  atoms.forEach((a, i) => {
    if (a.accent) accentIdxInLine.push(i);
  });

  if (accentIdxInLine.length === 0) {
    // No accents — start at 0 and go.
    for (let i = 0; i < atoms.length; i++) cols[i] = i;
    return cols;
  }

  // Place each accent on its slot column; place preceding non-accent chars
  // backwards from the accent (so they sit right before it); place following
  // non-accent chars forwards from the accent.
  let cursor = 0;
  for (let k = 0; k < accentIdxInLine.length; k++) {
    const atomIdx = accentIdxInLine[k];
    const targetCol = layout.accentCols[k] ?? cursor;
    // Pre-accent chars: from cursor up to (targetCol - 1)
    const preStart = k === 0 ? 0 : accentIdxInLine[k - 1] + 1;
    const preCount = atomIdx - preStart;
    const firstPreCol = targetCol - preCount;
    for (let i = 0; i < preCount; i++) {
      cols[preStart + i] = firstPreCol + i;
    }
    cols[atomIdx] = targetCol;
    cursor = targetCol + 1;
  }
  // Tail chars after last accent
  const lastAccentAtom = accentIdxInLine[accentIdxInLine.length - 1];
  for (let i = lastAccentAtom + 1; i < atoms.length; i++) {
    cols[i] = cursor;
    cursor++;
  }
  return cols;
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
 * Render a single line of the sheet. Lines inside the same section share the
 * column layout: each bar slot is assigned a column count equal to the MAX
 * char count for that bar across all lines in the section. Lines with fewer
 * chars just leave the trailing columns empty — that's what keeps the same
 * bar's accent chars vertically aligned across lines.
 *
 * Chord bands span from their accent column up to the next chord's accent
 * (possibly crossing bar boundaries).
 */
function LineRow({
  bars,
  slotLayouts,
  carryOverChord,
  label,
  activeChordKey,
  keyOfDegree,
  handleHoverChord,
  handleClickChord,
  handleDblClickChord,
  fontSize,
}: {
  bars: Bar[];
  /** Section-level layout: slotLayouts[bi] has { accentCols, totalCols } for bar bi */
  slotLayouts: BarSlotLayout[];
  /** The chord carried over from the previous line of the same section (null on first line). */
  carryOverChord: { degree: number } | null;
  label: (degree: number) => string;
  activeChordKey: string | null;
  keyOfDegree: (degree: number) => string | null;
  handleHoverChord: (k: string | null) => void;
  handleClickChord: (k: string) => void;
  handleDblClickChord: (k: string) => void;
  fontSize: number;
}) {
  // Cumulative start column for each bar slot inside this section's grid.
  const barStartCols: number[] = [];
  {
    let acc = 0;
    for (let i = 0; i < slotLayouts.length; i++) {
      barStartCols.push(acc);
      acc += slotLayouts[i].totalCols;
    }
  }
  const totalCols = Math.max(
    1,
    slotLayouts.reduce((s, l) => s + l.totalCols, 0),
  );

  type LyricAtom = { ch: string; accent: boolean; barIdx: number; chordIdx: number; col: number };
  const atoms: LyricAtom[] = [];
  type ChordRef = { barIdx: number; chordIdx: number; degree: number; startCol: number; accentCol: number };
  const chords: ChordRef[] = [];

  bars.forEach((bar, bi) => {
    const barAtomList = barAtoms(bar);
    const layout = slotLayouts[bi];
    const atomCols = placeAtomsInSlot(barAtomList, layout);
    const barStart = barStartCols[bi];

    // Accent positions in this line (atom indices, then their assigned cols).
    const accentAtomIndices: number[] = [];
    barAtomList.forEach((a, i) => {
      if (a.accent) accentAtomIndices.push(i);
    });

    // Push chord refs: one per chord in this bar. Chord k anchors to the k-th
    // accent in the line (if it has one), otherwise to the first atom it owns.
    // Chord's chip band starts at the accent column (line-global) unless it's
    // the very first chord of the line, in which case start at column 0.
    bar.chords.forEach((chord, ci) => {
      // Find the first atom belonging to this chord
      const firstOwnedIdx = barAtomList.findIndex((a) => a.chordIdx === ci);
      const firstAccentOfChord = barAtomList.findIndex((a) => a.chordIdx === ci && a.accent);
      const anchorAtomIdx = firstAccentOfChord >= 0 ? firstAccentOfChord : firstOwnedIdx;
      const accentCol = barStart + (anchorAtomIdx >= 0 ? atomCols[anchorAtomIdx] : 0);
      const isFirstChordOfLine = bi === 0 && ci === 0;
      // If there's a chord carried over from the previous line, the line-leading
      // region (0 → accentCol) belongs to the carry-over, so this chord starts
      // at its own accent column. Otherwise (first line of section) it starts at 0.
      const startCol = isFirstChordOfLine ? (carryOverChord ? accentCol : 0) : accentCol;
      chords.push({ barIdx: bi, chordIdx: ci, degree: chord.degree, startCol, accentCol });
    });

    barAtomList.forEach((a, i) => {
      atoms.push({ ...a, barIdx: bi, col: barStart + atomCols[i] });
    });
  });

  return (
    <div
      className="grid min-w-0 mb-2 leading-relaxed"
      style={{
        gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))`,
        gridTemplateRows: 'auto auto',
        fontSize: `${fontSize}px`,
        lineHeight: 1.2,
      }}
    >
      {/* Carry-over band: if a chord is still active from the previous line,
          extend its color from column 0 up to where this line's first chord starts.
          No label — it's already shown on the previous line's chip. */}
      {carryOverChord &&
        chords.length > 0 &&
        chords[0].startCol > 0 &&
        (() => {
          const vKey = keyOfDegree(carryOverChord.degree);
          const isActive = vKey != null && vKey === activeChordKey;
          const color = `var(--color-deg-${carryOverChord.degree})`;
          return (
            <button
              key="carryover"
              onClick={() => vKey && handleClickChord(vKey)}
              onDoubleClick={() => vKey && handleDblClickChord(vKey)}
              onPointerEnter={() => vKey && handleHoverChord(vKey)}
              onPointerLeave={() => handleHoverChord(null)}
              className="text-left text-xs font-mono py-0.5 cursor-pointer"
              style={{
                gridRow: 1,
                gridColumn: `1 / ${chords[0].startCol + 1}`,
                background: isActive ? color : `color-mix(in srgb, ${color} 20%, transparent)`,
                color: isActive ? 'var(--crust)' : color,
                border: 'none',
                padding: 0,
                transition: 'all var(--transition)',
              }}
            >
              {/* Invisible label keeps this band's intrinsic height equal to the chord chips' */}
              <span aria-hidden style={{ visibility: 'hidden' }}>
                {label(carryOverChord.degree)}
              </span>
            </button>
          );
        })()}

      {/* Chord chips — background spans from startCol to next chord's startCol (or line end).
          The label text inside is anchored to the accent column so it sits right above
          the accent char in the lyric row. */}
      {chords.map((chord, ci) => {
        const endCol = ci + 1 < chords.length ? chords[ci + 1].startCol : totalCols;
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
              minHeight: '1.4em',
            }}
          >
            {/* Invisible spacer keeps the button's intrinsic height matching the label */}
            <span aria-hidden style={{ visibility: 'hidden' }}>
              {label(chord.degree)}
            </span>
            {/* Visible label, anchored to the accent column inside the band */}
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

      {/* Lyric chars — each placed by its absolute column so empty trailing cells
          (when a bar has fewer chars than its section-wide budget) just stay blank. */}
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
                gridColumn: `${a.col + 1}`,
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
              gridColumn: `${a.col + 1}`,
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

  // Per-section slot layout: for each bar slot, compute accent column positions
  // so same-bar accents align across lines (see computeBarSlotLayout).
  const sectionSlotLayouts = (section: import('../data/songSheet').Section): BarSlotLayout[] => {
    if (section.lines.length === 0) return [];
    const barCount = Math.max(...section.lines.map((l) => l.bars.length));
    const layouts: BarSlotLayout[] = [];
    for (let bi = 0; bi < barCount; bi++) {
      const barsInSlot = section.lines.map((l) => l.bars[bi]).filter(Boolean);
      layouts.push(computeBarSlotLayout(barsInSlot));
    }
    return layouts;
  };

  // Font size per section: based on the total column budget so every line in
  // the section uses the same font size (and thus the same column pixel width).
  const sectionFontSize = (layouts: BarSlotLayout[]): number => {
    if (bodyWidth === 0) return 16;
    const totalCols = layouts.reduce((s, l) => s + l.totalCols, 0);
    if (totalCols === 0) return 16;
    const raw = bodyWidth / (totalCols * CH_EM);
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
        {sheet.sections.map((section, si) => {
          const slotLayouts = sectionSlotLayouts(section);
          const fs = sectionFontSize(slotLayouts);
          // Track the last chord from the previous line so its color can carry over
          // onto the next line's leading region.
          let lastChord: { degree: number } | null = null;
          return (
            <div key={si} className="mb-4 font-mono">
              {section.name && (
                <div className="text-[10px] uppercase tracking-wide text-overlay0 mb-1">[{section.name}]</div>
              )}
              {section.lines.map((line, li) => {
                const carryOver = lastChord;
                // Update lastChord for the next line: pick the last chord in this line's last bar.
                const lastBar = line.bars[line.bars.length - 1];
                if (lastBar && lastBar.chords.length > 0) {
                  lastChord = { degree: lastBar.chords[lastBar.chords.length - 1].degree };
                }
                return (
                  <LineRow
                    key={li}
                    bars={line.bars}
                    slotLayouts={slotLayouts}
                    carryOverChord={carryOver}
                    label={label}
                    activeChordKey={activeChordKey}
                    keyOfDegree={keyOfDegree}
                    handleHoverChord={handleHoverChord}
                    handleClickChord={handleClickChord}
                    handleDblClickChord={handleDblClickChord}
                    fontSize={fs}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
