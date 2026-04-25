import { useTranslation } from 'react-i18next';
import { NOTE_DISPLAY, NOTES, type NoteName, type ChordVoicing, voicingKey } from '../data/chordData';
import type { SongSheet } from '../data/songSheet';
import { parseBarSource } from '../data/songSheet';

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
 * Render a single bar cell: N chord chips on top, single continuous lyric line below.
 * Multiple accent characters in the lyric row are laid out with `justify-content: space-between`
 * and flex-growing gaps between them so the accents spread evenly across the bar's width.
 */
function BarCell({
  bar,
  label,
  activeChordKey,
  keyOfDegree,
  handleHoverChord,
  handleClickChord,
  handleDblClickChord,
}: {
  bar: import('../data/songSheet').Bar;
  label: (degree: number) => string;
  activeChordKey: string | null;
  keyOfDegree: (degree: number) => string | null;
  handleHoverChord: (k: string | null) => void;
  handleClickChord: (k: string) => void;
  handleDblClickChord: (k: string) => void;
}) {
  // Merge every chord's chars back into one ordered stream; record which chord
  // each accent-run belongs to so we can color correctly.
  type LyricAtom = { ch: string; accent: boolean; chordIdx: number };
  const atoms: LyricAtom[] = [];
  bar.chords.forEach((chord, ci) => {
    for (const a of parseBarSource(chord.source).chars) {
      atoms.push({ ...a, chordIdx: ci });
    }
  });

  // Group atoms into runs: either "accent block" or "plain text block".
  type Run = { kind: 'accent' | 'text'; chordIdx: number; text: string };
  const runs: Run[] = [];
  for (const a of atoms) {
    const kind: 'accent' | 'text' = a.accent ? 'accent' : 'text';
    const last = runs[runs.length - 1];
    if (last && last.kind === kind && last.chordIdx === a.chordIdx) {
      last.text += a.ch;
    } else {
      runs.push({ kind, chordIdx: a.chordIdx, text: a.ch });
    }
  }

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {/* Chord chips: one per chord, evenly distributed across the bar width */}
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${bar.chords.length}, minmax(0, 1fr))` }}>
        {bar.chords.map((chord, ci) => {
          const vKey = keyOfDegree(chord.degree);
          const isActive = vKey != null && vKey === activeChordKey;
          const color = `var(--color-deg-${chord.degree})`;
          return (
            <button
              key={ci}
              onClick={() => vKey && handleClickChord(vKey)}
              onDoubleClick={() => vKey && handleDblClickChord(vKey)}
              onPointerEnter={() => vKey && handleHoverChord(vKey)}
              onPointerLeave={() => handleHoverChord(null)}
              className="text-left text-xs font-mono px-1 py-0.5 rounded cursor-pointer"
              style={{
                background: isActive ? color : `color-mix(in srgb, ${color} 20%, transparent)`,
                color: isActive ? 'var(--crust)' : color,
                fontWeight: isActive ? 700 : 500,
                transition: 'all var(--transition)',
              }}
            >
              {label(chord.degree)}
            </button>
          );
        })}
      </div>

      {/* Lyrics row: one continuous strip. Accent chars are fixed-width inline
          blocks; text in between uses flex to spread accents evenly. */}
      <div className="flex items-baseline text-base select-none">
        {runs.map((run, i) => {
          const color = `var(--color-deg-${bar.chords[run.chordIdx].degree})`;
          if (run.kind === 'accent') {
            return (
              <span
                key={i}
                style={{
                  background: `color-mix(in srgb, ${color} 30%, transparent)`,
                  color,
                  fontWeight: 700,
                  padding: '0 1px',
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              >
                {run.text}
              </span>
            );
          }
          // Plain text run — flex-grow so blocks between accents stretch evenly.
          // The first and last plain blocks also grow so the whole strip fills the bar width.
          return (
            <span
              key={i}
              style={{
                color: 'var(--text)',
                opacity: 0.55,
                flex: 1,
                display: 'inline-flex',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {run.text}
            </span>
          );
        })}
      </div>
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
      <div className="panel-body">
        {sheet.strum && <div className="font-mono text-sm mb-3 text-subtext0">{sheet.strum}</div>}
        {sheet.sections.map((section, si) => {
          return (
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
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
