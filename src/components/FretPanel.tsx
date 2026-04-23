import { useTranslation } from 'react-i18next';
import { Fretboard } from './Fretboard';
import type { ChordVoicing } from '../data/chordData';

const INTERVAL_ORDER = ['R', 'b3', '3', '4', '5', 'b7', '7'];

interface FretPanelProps {
  filteredVoicings: ChordVoicing[];
  filteredOptimal: ChordVoicing[];
  light: boolean;
  activeChordKey: string | null;
  handleHoverChord: (k: string | null) => void;
  handleClickChord: (k: string) => void;
  handleDblClickChord: (k: string) => void;
  intervalMode: boolean;
  setIntervalMode: (fn: (v: boolean) => boolean) => void;
  visibleIntervals: Set<string>;
  toggleInterval: (iv: string) => void;
  intervalMap: string[][];
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

export function FretPanel({
  filteredVoicings,
  filteredOptimal,
  light,
  activeChordKey,
  handleHoverChord,
  handleClickChord,
  handleDblClickChord,
  intervalMode,
  setIntervalMode,
  visibleIntervals,
  toggleInterval,
  intervalMap,
  onExpand,
}: FretPanelProps) {
  const { t } = useTranslation();
  return (
    <section className="panel mb-2 md:mb-6 w-full">
      <div className="panel-header">
        <span className="panel-title flex-1">{t('fretboardOverview')}</span>
        <button
          onClick={() => setIntervalMode((v) => !v)}
          className={`text-[9px] px-1.5 h-5 rounded-full cursor-pointer flex items-center justify-center mr-1 ${intervalMode ? 'bg-blue text-crust font-bold' : 'bg-surface0 text-overlay1'}`}
          style={{ transition: 'all var(--transition)' }}
        >
          {'♫'}
        </button>
        {intervalMode &&
          INTERVAL_ORDER.map((iv) => (
            <button
              key={iv}
              onClick={() => toggleInterval(iv)}
              className={`text-[8px] px-1 h-5 rounded-full cursor-pointer flex items-center justify-center ${visibleIntervals.has(iv) ? 'bg-blue/20 text-blue font-bold' : 'text-overlay0 opacity-40'}`}
              style={{ transition: 'all var(--transition)' }}
            >
              {iv}
            </button>
          ))}
        {onExpand && <ExpandBtn onClick={onExpand} title={t('expand')} />}
      </div>
      <div className="panel-body">
        <Fretboard
          voicings={filteredVoicings}
          optimal={filteredOptimal}
          light={light}
          hoveredChord={activeChordKey}
          onHoverChord={handleHoverChord}
          onClickChord={handleClickChord}
          onDblClickChord={handleDblClickChord}
          intervalMode={intervalMode}
          intervalMap={intervalMap}
          visibleIntervals={visibleIntervals}
        />
      </div>
    </section>
  );
}
