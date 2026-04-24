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
  group?: string; // e.g. 'builtin' | 'user'
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
  onExpand?: () => void;
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
  onExpand,
}: SongSheetPanelProps) {
  const { t } = useTranslation();

  // Resolve a degree to its optimal voicing's key (used for cross-view highlighting)
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
        {onExpand && <ExpandBtn onClick={onExpand} title={t('expand')} />}
      </div>
      <div className="panel-body">
        {sheet.strum && <div className="font-mono text-sm mb-3 text-subtext0">{sheet.strum}</div>}
        {sheet.sections.map((section, si) => (
          <div key={si} className="mb-4">
            {section.name && (
              <div className="text-[10px] uppercase tracking-wide text-overlay0 mb-1">[{section.name}]</div>
            )}
            {section.lines.map((line, li) => {
              const bars = line.bars;
              return (
                <div
                  key={li}
                  className="grid gap-0.5 mb-2 leading-relaxed"
                  style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
                >
                  {/* Chord header row */}
                  {bars.map((bar, bi) => {
                    const vKey = keyOfDegree(bar.degree);
                    const isActive = vKey != null && vKey === activeChordKey;
                    const color = `var(--color-deg-${bar.degree})`;
                    return (
                      <button
                        key={`h-${bi}`}
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
                        {label(bar.degree)}
                      </button>
                    );
                  })}
                  {/* Lyrics row */}
                  {bars.map((bar, bi) => {
                    const { chars } = parseBarSource(bar.source);
                    const color = `var(--color-deg-${bar.degree})`;
                    const vKey = keyOfDegree(bar.degree);
                    return (
                      <div
                        key={`l-${bi}`}
                        onClick={() => vKey && handleClickChord(vKey)}
                        onPointerEnter={() => vKey && handleHoverChord(vKey)}
                        onPointerLeave={() => handleHoverChord(null)}
                        className="text-base cursor-pointer select-none"
                        style={{ transition: 'all var(--transition)' }}
                      >
                        {chars.map((c, ci) => (
                          <span
                            key={ci}
                            style={
                              c.accent
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
                            {c.ch === ' ' ? ' ' : c.ch}
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
