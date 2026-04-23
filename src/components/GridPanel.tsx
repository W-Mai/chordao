import { useTranslation } from 'react-i18next';
import { ShapeGrid } from './ShapeGrid';
import type { ChordVoicing, BassPrefer } from '../data/chordData';

interface GridPanelProps {
  filteredVoicings: ChordVoicing[];
  filteredOptimal: ChordVoicing[];
  allCombos: ChordVoicing[][];
  comboIdx: number;
  setComboIdx: (i: number) => void;
  positionPrefer: BassPrefer;
  togglePrefer: () => void;
  light: boolean;
  activeChordKey: string | null;
  handleHoverChord: (k: string | null) => void;
  handleClickChord: (k: string) => void;
  handleDblClickChord: (k: string) => void;
  progressionDegrees?: number[];
  animationDuration?: number;
  activeStep?: number;
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

export function GridPanel({
  filteredVoicings,
  filteredOptimal,
  allCombos,
  comboIdx,
  setComboIdx,
  positionPrefer,
  togglePrefer,
  light,
  activeChordKey,
  handleHoverChord,
  handleClickChord,
  handleDblClickChord,
  progressionDegrees,
  animationDuration,
  activeStep,
  onExpand,
}: GridPanelProps) {
  const { t } = useTranslation();
  return (
    <section className="panel mb-2 md:mb-6 w-full">
      <div className="panel-header">
        <span className="panel-title flex-1">{t('shapeGrid')}</span>
        {allCombos.length > 1 && (
          <div className="flex gap-0.5 mr-2">
            <button
              onClick={() => setComboIdx(-1)}
              className={`text-[9px] px-1.5 h-5 rounded-full cursor-pointer flex items-center justify-center ${comboIdx === -1 ? 'bg-blue text-crust font-bold' : 'bg-surface0 text-overlay1'}`}
              style={{ transition: 'all var(--transition)' }}
            >
              {t('all')}
            </button>
            {allCombos.map((_, i) => (
              <button
                key={i}
                onClick={() => setComboIdx(i)}
                className={`text-[9px] w-5 h-5 rounded-full cursor-pointer flex items-center justify-center ${comboIdx === i ? 'bg-blue text-crust font-bold' : 'bg-surface0 text-overlay1'}`}
                style={{ transition: 'all var(--transition)' }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={togglePrefer}
          className={`text-[9px] px-1.5 h-5 rounded-full cursor-pointer flex items-center justify-center mr-1 ${positionPrefer !== 'none' ? 'bg-blue text-crust font-bold' : 'bg-surface0 text-overlay1'}`}
          style={{ transition: 'all var(--transition)' }}
        >
          {positionPrefer === 'ascending' ? '↗' : positionPrefer === 'descending' ? '↘' : '—'}
        </button>
        {onExpand && <ExpandBtn onClick={onExpand} title={t('expand')} />}
      </div>
      <div className="panel-body">
        <ShapeGrid
          voicings={filteredVoicings}
          optimal={filteredOptimal}
          light={light}
          hoveredChord={activeChordKey}
          onHoverChord={handleHoverChord}
          onClickChord={handleClickChord}
          onDblClickChord={handleDblClickChord}
          progressionDegrees={progressionDegrees}
          allCombos={comboIdx === -1 ? allCombos : undefined}
          animationDuration={animationDuration}
          activeStep={activeStep}
        />
      </div>
    </section>
  );
}
