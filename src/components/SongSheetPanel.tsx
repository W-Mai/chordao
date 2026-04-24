import { useTranslation } from 'react-i18next';
import { NOTE_DISPLAY, NOTES, type NoteName, type ChordVoicing, voicingKey } from '../data/chordData';
import type { SongSheet, Section } from '../data/songSheet';
import { parseBarSource } from '../data/songSheet';

/**
 * Visual width of a string under a monospace font:
 * CJK ideographs (and other wide codepoints) count as 2, ASCII as 1.
 * Good enough heuristic — we'll pad with half-width non-breaking spaces.
 */
function visualWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) > 0x7f ? 2 : 1;
  return w;
}

const HALF_SPACE = ' '; // non-breaking half-width space (monospace-stable)

interface AccentSlice {
  pre: string;
  accent: string;
  post: string;
}

function sliceAroundAccent(chars: Array<{ ch: string; accent: boolean }>): AccentSlice {
  const firstAccent = chars.findIndex((c) => c.accent);
  if (firstAccent < 0) {
    // No accent marker — treat everything as pre, empty accent/post.
    return { pre: chars.map((c) => c.ch).join(''), accent: '', post: '' };
  }
  let lastAccent = firstAccent;
  for (let i = firstAccent; i < chars.length; i++) if (chars[i].accent) lastAccent = i;
  return {
    pre: chars
      .slice(0, firstAccent)
      .map((c) => c.ch)
      .join(''),
    accent: chars
      .slice(firstAccent, lastAccent + 1)
      .map((c) => c.ch)
      .join(''),
    post: chars
      .slice(lastAccent + 1)
      .map((c) => c.ch)
      .join(''),
  };
}

/**
 * For each bar index in a section, find the max visual width of the
 * pre-accent segment across all lines. Lines with shorter pre-accent
 * get padded from the left so that accent chars line up vertically.
 */
function computeSectionAlignment(section: Section): { prePadMax: number[] } {
  if (section.lines.length === 0) return { prePadMax: [] };
  const barCount = Math.max(...section.lines.map((l) => l.bars.length));
  const prePadMax: number[] = Array(barCount).fill(0);
  for (const line of section.lines) {
    line.bars.forEach((bar, bi) => {
      const { chars } = parseBarSource(bar.source);
      const { pre } = sliceAroundAccent(chars);
      const w = visualWidth(pre);
      if (w > prePadMax[bi]) prePadMax[bi] = w;
    });
  }
  return { prePadMax };
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
  onNewSong?: () => void;
  onEditSong?: () => void;
  onClosePanel?: () => void;
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
  onNewSong,
  onEditSong,
  onClosePanel,
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
          const { prePadMax } = computeSectionAlignment(section);
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
                      const slice = sliceAroundAccent(chars);
                      const padW = Math.max(0, (prePadMax[bi] ?? 0) - visualWidth(slice.pre));
                      const padStr = HALF_SPACE.repeat(padW);
                      const color = `var(--color-deg-${bar.degree})`;
                      const vKey = keyOfDegree(bar.degree);
                      return (
                        <div
                          key={`l-${bi}`}
                          onClick={() => vKey && handleClickChord(vKey)}
                          onPointerEnter={() => vKey && handleHoverChord(vKey)}
                          onPointerLeave={() => handleHoverChord(null)}
                          className="text-base cursor-pointer select-none whitespace-pre"
                          style={{ transition: 'all var(--transition)' }}
                        >
                          {padStr && <span style={{ color: 'var(--text)', opacity: 0.55 }}>{padStr}</span>}
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
                                  : { color: 'var(--text)', opacity: 0.55 }
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
          );
        })}
      </div>
    </section>
  );
}
