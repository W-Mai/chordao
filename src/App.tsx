import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  NOTES,
  NOTE_DISPLAY,
  CIRCLE_OF_FIFTHS,
  generateVoicings,
  groupByDegree,
  findOptimalCombination,
  voicingKey,
  type NoteName,
  type ChordVoicing,
  PROGRESSIONS,
} from './chordData';
import { ChordDiagram } from './ChordDiagram';
import { Fretboard } from './Fretboard';
import { ShapeGrid } from './ShapeGrid';
import { FullscreenOverlay, useOverlayFullscreen } from './FullscreenOverlay';

import { Roller } from './Roller';

import { Guide } from './Guide';
import { useExportImage } from './ExportView';

const DEGREE_LABELS = ['', 'I', 'IIm', 'IIIm', 'IV', 'V', 'VIm'];
const THEMES = ['dark', 'light', 'cyber'] as const;
const THEME_ICONS: Record<string, string> = { dark: '🌙', light: '☀️', cyber: '⚡' };

function ExpandBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-2 py-1 rounded border border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer transition-all"
      style={{ transition: 'all var(--transition)' }}
      title="Expand"
    >
      ⛶
    </button>
  );
}

function App() {
  const { t, i18n } = useTranslation();
  const [selectedKey, _setSelectedKey] = useState<NoteName>('C');

  const [hoveredChord, setHoveredChord] = useState<string | null>(null);
  const [lockedChord, setLockedChord] = useState<string | null>(null);
  const activeChordKey = lockedChord ?? hoveredChord;
  const handleHoverChord = useCallback((key: string | null) => setHoveredChord(key), []);
  const resetHover = useCallback(() => {
    setHoveredChord(null);
    setLockedChord(null);
  }, []);

  const setSelectedKey = useCallback(
    (k: NoteName) => {
      _setSelectedKey(k);
      resetHover();
    },
    [resetHover],
  );

  const systemTheme = () => (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  const [theme, setTheme] = useState<string>(() => {
    const saved = localStorage.getItem('chordao:theme');
    if (saved && THEMES.includes(saved as (typeof THEMES)[number])) return saved;
    return systemTheme();
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Follow system theme when in auto mode
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      if (!localStorage.getItem('chordao:theme')) {
        setTheme(mq.matches ? 'light' : 'dark');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme((t) => {
      const next = THEMES[(THEMES.indexOf(t as (typeof THEMES)[number]) + 1) % THEMES.length];
      // If next theme matches system preference, enter auto mode
      if (next === systemTheme()) {
        localStorage.removeItem('chordao:theme');
      } else {
        localStorage.setItem('chordao:theme', next);
      }
      return next;
    });
  }, []);

  const light = theme === 'light';

  const [showBarre, setShowBarre] = useState(() => localStorage.getItem('chordao:showBarre') !== 'false');
  const toggleBarre = useCallback(() => {
    setShowBarre((v) => {
      localStorage.setItem('chordao:showBarre', String(!v));
      return !v;
    });
  }, []);

  const [keyOrder, setKeyOrder] = useState<'fifths' | 'chromatic'>(
    () => (localStorage.getItem('chordao:keyOrder') as 'fifths' | 'chromatic') || 'fifths',
  );
  const toggleKeyOrder = useCallback(() => {
    setKeyOrder((v) => {
      const next = v === 'fifths' ? 'chromatic' : 'fifths';
      localStorage.setItem('chordao:keyOrder', next);
      return next;
    });
  }, []);
  const keyList = keyOrder === 'fifths' ? CIRCLE_OF_FIFTHS : NOTES;

  const voicings = useMemo(() => generateVoicings(selectedKey), [selectedKey]);
  const grouped = useMemo(() => groupByDegree(voicings), [voicings]);

  const [activeDegree, setActiveDegree] = useState<number | null>(null);
  const toggleDegree = useCallback(
    (d: number) => {
      setActiveDegree((v) => (v === d ? null : d));
      resetHover();
    },
    [resetHover],
  );

  const [activeProg, setActiveProg] = useState<string | null>(null);
  const toggleProg = useCallback(
    (name: string) => {
      setActiveProg((v) => (v === name ? null : name));
      setActiveDegree(null);
      resetHover();
    },
    [resetHover],
  );

  const activeProgObj = useMemo(
    () => (activeProg ? PROGRESSIONS.find((p) => p.name === activeProg) : null),
    [activeProg],
  );
  const optimal = useMemo(() => findOptimalCombination(grouped, activeProgObj?.degrees), [grouped, activeProgObj]);
  const optimalSet = useMemo(() => new Set(optimal.map(voicingKey)), [optimal]);

  const activeProgDegrees = useMemo(() => {
    if (!activeProgObj) return null;
    return new Set(activeProgObj.degrees);
  }, [activeProgObj]);

  const filteredVoicings = useMemo(() => {
    if (activeDegree) return voicings.filter((v) => v.degree === activeDegree);
    if (activeProgDegrees) return voicings.filter((v) => activeProgDegrees.has(v.degree));
    return voicings;
  }, [voicings, activeDegree, activeProgDegrees]);
  const filteredOptimal = useMemo(() => {
    if (activeDegree) return optimal.filter((v) => v.degree === activeDegree);
    if (activeProgDegrees) return optimal.filter((v) => activeProgDegrees.has(v.degree));
    return optimal;
  }, [optimal, activeDegree, activeProgDegrees]);

  const handleClickChord = useCallback((key: string) => {
    setLockedChord((prev) => (prev === key ? null : key));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = keyList.indexOf(selectedKey);
      if (e.key === 'ArrowLeft') setSelectedKey(keyList[(idx - 1 + 12) % 12]);
      else if (e.key === 'ArrowRight') setSelectedKey(keyList[(idx + 1) % 12]);
      else if (e.key >= '1' && e.key <= '6') toggleDegree(Number(e.key));
      else if (e.key === '0' || e.key === 'Escape') setActiveDegree(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedKey, toggleDegree]);

  const { exportImage, ExportContainer, PreviewModal } = useExportImage({
    selectedKey,
    voicings,
    optimal,
    optimalSet,
    grouped,
    showBarre,
    activeProg,
    filteredVoicings,
    filteredOptimal,
  });

  const [gridFS, openGrid, closeGrid] = useOverlayFullscreen();
  const [fretFS, openFret, closeFret] = useOverlayFullscreen();
  const [chordFS, openChord, closeChord] = useOverlayFullscreen();
  const [activeChord, setActiveChord] = useState<ChordVoicing | null>(null);

  const handleChordDblClick = useCallback(
    (v: ChordVoicing) => {
      setActiveChord(v);
      openChord();
    },
    [openChord],
  );
  const handleCloseChord = useCallback(() => {
    closeChord();
    setActiveChord(null);
  }, [closeChord]);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        {/* Sidebar */}
        <aside
          className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-surface0 bg-mantle p-3 md:p-4
                          flex flex-col gap-3 md:gap-4 md:overflow-y-auto md:min-h-0"
          style={{ transition: 'background var(--transition), border-color var(--transition)' }}
        >
          {/* Header: mobile=one row, desktop=two rows */}
          <div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl bg-blue/15 flex items-center justify-center shrink-0"
                style={{ boxShadow: theme === 'cyber' ? '0 0 10px var(--blue)' : 'none' }}
              >
                <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold tracking-wide leading-tight text-txt"
                  style={{ textShadow: theme === 'cyber' ? '0 0 8px var(--blue)' : 'none' }}
                >{t('appName')}</h1>
                <p className="text-[9px] text-overlay1 leading-tight hidden md:block">{t('subtitle')}</p>
              </div>
              {/* Mobile: buttons inline */}
              <div className="flex gap-1 shrink-0 md:hidden">
                <button onClick={toggleBarre}
                  className={`text-[10px] w-7 h-7 rounded border cursor-pointer flex items-center justify-center ${showBarre ? 'border-blue text-blue' : 'border-surface0 text-overlay1'}`}
                  style={{ transition: 'all var(--transition)' }}
                >B</button>
                <button onClick={toggleKeyOrder}
                  className={`text-[10px] w-7 h-7 rounded border cursor-pointer flex items-center justify-center ${keyOrder === 'fifths' ? 'border-blue text-blue' : 'border-surface0 text-overlay1'}`}
                  style={{ transition: 'all var(--transition)' }}
                >{keyOrder === 'fifths' ? '⑤' : '♪'}</button>
                <button onClick={cycleTheme}
                  className="text-[10px] w-7 h-7 rounded border border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer flex items-center justify-center"
                  style={{ transition: 'all var(--transition)' }}
                >{THEME_ICONS[theme]}</button>
                <Guide />
                <button
                  onClick={() => { const next = i18n.language === 'en' ? 'zh' : 'en'; i18n.changeLanguage(next); localStorage.setItem('chordao:lang', next); }}
                  className="text-[10px] w-7 h-7 rounded border border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer flex items-center justify-center"
                  style={{ transition: 'all var(--transition)' }}
                >{i18n.language === 'en' ? '中' : 'En'}</button>
              </div>
            </div>
            {/* Desktop: buttons second row */}
            <div className="hidden md:grid grid-cols-5 gap-1 mt-2">
              <button onClick={toggleBarre}
                className={`text-[11px] py-1.5 rounded border cursor-pointer text-center ${showBarre ? 'border-blue text-blue' : 'border-surface0 text-overlay1'}`}
                style={{ transition: 'all var(--transition)' }}
              >Barre</button>
              <button onClick={toggleKeyOrder}
                className={`text-[11px] py-1.5 rounded border cursor-pointer text-center ${keyOrder === 'fifths' ? 'border-blue text-blue' : 'border-surface0 text-overlay1'}`}
                style={{ transition: 'all var(--transition)' }}
              >{keyOrder === 'fifths' ? '⑤ 5ths' : '♪ Semi'}</button>
              <button onClick={cycleTheme}
                className="text-[11px] py-1.5 rounded border border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer text-center"
                style={{ transition: 'all var(--transition)' }}
              >{THEME_ICONS[theme]}</button>
              <Guide />
              <button
                onClick={() => { const next = i18n.language === 'en' ? 'zh' : 'en'; i18n.changeLanguage(next); localStorage.setItem('chordao:lang', next); }}
                className="text-[11px] py-1.5 rounded border border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer text-center"
                style={{ transition: 'all var(--transition)' }}
              >{i18n.language === 'en' ? '中' : 'En'}</button>
            </div>
          </div>
          <div className="grid grid-cols-6 md:grid-cols-4 gap-1">
            {keyList.map((note) => (
              <button
                key={note}
                onClick={() => setSelectedKey(note)}
                className={`px-1 py-1.5 rounded text-xs cursor-pointer ${
                  selectedKey === note
                    ? 'bg-blue text-crust font-bold'
                    : 'border border-surface0 text-overlay1 hover:border-blue'
                }`}
                style={{
                  transition: 'all var(--transition)',
                  boxShadow: selectedKey === note ? '0 0 8px var(--blue)' : 'none',
                }}
              >
                {NOTE_DISPLAY[note]}
              </button>
            ))}
          </div>

          {/* Degree filter */}
          <div className="grid grid-cols-6 md:grid-cols-3 gap-1.5">
            {DEGREE_LABELS.slice(1).map((label, i) => {
              const deg = i + 1;
              const isActive = activeDegree === deg;
              const dimmed = activeDegree !== null && !isActive;
              return (
                <button
                  key={label}
                  onClick={() => toggleDegree(deg)}
                  className={`px-2 py-1 rounded-full text-xs font-bold text-white cursor-pointer ${dimmed ? 'opacity-20' : ''}`}
                  style={{
                    background: `var(--color-deg-${deg})`,
                    transition: 'all var(--transition)',
                    boxShadow: isActive ? `0 0 12px var(--color-deg-${deg})` : 'none',
                    transform: isActive ? 'scale(1.08)' : 'scale(1)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Progressions */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-overlay0 uppercase tracking-wider hidden md:block">
              {t('progressions')}
            </span>
            {/* Desktop: vertical list */}
            <div className="hidden md:flex md:flex-col gap-1 max-h-40 overflow-y-auto">
              {PROGRESSIONS.map((p) => {
                const isActive = activeProg === p.name;
                return (
                  <button
                    key={p.name}
                    onClick={() => toggleProg(p.name)}
                    className={`text-left text-[11px] px-2 py-1 rounded cursor-pointer whitespace-nowrap ${
                      isActive ? 'bg-blue/15 text-blue' : 'text-subtext0 hover:text-txt hover:bg-surface0/30'
                    }`}
                    style={{ transition: 'all var(--transition)' }}
                  >
                    {t(p.name)} <span className="text-overlay0">{p.degrees.join('-')}</span>
                  </button>
                );
              })}
            </div>
            {/* Mobile: vertical roller */}
            <div className="md:hidden">
              <Roller
                items={[{ name: '', degrees: [] as number[] }, ...PROGRESSIONS]}
                activeKey={activeProg ?? ''}
                getKey={(p) => p.name}
                getLabel={(p) => (p.name ? `${t(p.name)} ${p.degrees.join('-')}` : t('none'))}
                onSelect={(name) => setActiveProg(name || null)}
              />
            </div>
          </div>

          <div className="hidden md:block mt-auto" />
        </aside>

        {/* Main */}
        <main
          className="flex-1 min-h-0 p-2 md:p-6 overflow-y-auto bg-crust"
          style={{ transition: 'background var(--transition)' }}
        >
          <section className="panel mb-2 md:mb-6">
            <div className="panel-header">
              <span className="panel-title flex-1">{t('shapeGrid')}</span>
              <ExpandBtn onClick={openGrid} />
            </div>
            <div className="panel-body">
              <ShapeGrid
                voicings={filteredVoicings}
                optimal={filteredOptimal}
                light={light}
                hoveredChord={activeChordKey}
                onHoverChord={handleHoverChord}
                onClickChord={handleClickChord}
                progressionDegrees={activeProgObj?.degrees}
              />
            </div>
          </section>

          <section className="panel mb-2 md:mb-6">
            <div className="panel-header">
              <span className="panel-title flex-1">{t('fretboardOverview')}</span>
              <ExpandBtn onClick={openFret} />
            </div>
            <div className="panel-body">
              <Fretboard
                voicings={filteredVoicings}
                optimal={filteredOptimal}
                light={light}
                hoveredChord={activeChordKey}
                onHoverChord={handleHoverChord}
                onClickChord={handleClickChord}
              />
            </div>
          </section>

          <section className="panel mb-2 md:mb-6">
            <div className="panel-header">
              <span className="panel-title">{t('chordDiagrams')}</span>
              <span className="text-[10px] text-overlay0 ml-2">{t('dblClickExpand')}</span>
            </div>
            <div className="panel-body">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:flex md:flex-wrap gap-2 md:gap-4 justify-items-center">
                {[1, 2, 3, 4, 5, 6].map((degree) => {
                  const dv = grouped.get(degree) ?? [];
                  return dv.map((v) => (
                    <ChordDiagram
                      key={voicingKey(v)}
                      voicing={v}
                      highlighted={
                        activeChordKey == null ? optimalSet.has(voicingKey(v)) : activeChordKey === voicingKey(v)
                      }
                      dimmed={activeChordKey != null && activeChordKey !== voicingKey(v)}
                      light={light}
                      showBarre={showBarre}
                      onDoubleClick={() => handleChordDblClick(v)}
                      onPointerEnter={() => handleHoverChord(voicingKey(v))}
                      onPointerLeave={() => handleHoverChord(null)}
                      onClick={() => handleClickChord(voicingKey(v))}
                    />
                  ));
                })}
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="shrink-0 bg-mantle" style={{ transition: 'background var(--transition)' }}>
        <div className="h-px bg-gradient-to-r from-transparent via-blue/30 to-transparent" />
        <div className="py-2.5 flex items-center justify-center gap-2 text-[11px] text-overlay1 flex-wrap">
          <span>Chordao</span>
          <span className="text-surface1">·</span>
          <span>E/Em/A/Am shape derivation</span>
          <span className="text-surface1">·</span>
          <a
            href="https://github.com/W-Mai/chordao"
            target="_blank"
            rel="noopener"
            className="text-blue hover:underline"
          >
            GitHub
          </a>
          <span className="text-surface1">·</span>
          <span>MIT</span>
          <span className="text-surface1">·</span>
          <button
            onClick={exportImage}
            className="px-2.5 py-0.5 rounded-md bg-blue/15 text-blue font-semibold cursor-pointer hover:bg-blue/25 text-[11px]"
            style={{ transition: 'all var(--transition)' }}
          >
            📷 {t('export')}
          </button>
        </div>
      </footer>

      {/* Fullscreen overlays */}
      <FullscreenOverlay active={gridFS} onClose={closeGrid}>
        <section className="panel w-full">
          <div className="panel-header">
            <span className="panel-title flex-1">{t('shapeGrid')}</span>
          </div>
          <div className="panel-body">
            <ShapeGrid
              voicings={filteredVoicings}
              optimal={filteredOptimal}
              light={light}
              hoveredChord={activeChordKey}
              onHoverChord={handleHoverChord}
              onClickChord={handleClickChord}
              progressionDegrees={activeProgObj?.degrees}
            />
          </div>
        </section>
      </FullscreenOverlay>
      <FullscreenOverlay active={fretFS} onClose={closeFret}>
        <section className="panel w-full">
          <div className="panel-header">
            <span className="panel-title flex-1">{t('fretboardOverview')}</span>
          </div>
          <div className="panel-body">
            <Fretboard
              voicings={filteredVoicings}
              optimal={filteredOptimal}
              light={light}
              hoveredChord={activeChordKey}
              onHoverChord={handleHoverChord}
              onClickChord={handleClickChord}
            />
          </div>
        </section>
      </FullscreenOverlay>
      <FullscreenOverlay active={chordFS} onClose={handleCloseChord}>
        {activeChord && (
          <div className="flex items-center justify-center w-full h-full">
            <ChordDiagram
              voicing={activeChord}
              highlighted={optimalSet.has(voicingKey(activeChord))}
              light={light}
              showBarre={showBarre}
              className="w-full max-w-[50vh]"
            />
          </div>
        )}
      </FullscreenOverlay>

      {ExportContainer}
      {PreviewModal}
    </div>
  );
}

export default App;
