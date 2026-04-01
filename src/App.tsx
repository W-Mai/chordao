import { useState, useMemo, useCallback, useEffect } from 'react';
import { NOTES, generateVoicings, groupByDegree, findOptimalCombination, type NoteName, type ChordVoicing } from './chordData';
import { ChordDiagram } from './ChordDiagram';
import { Fretboard } from './Fretboard';
import { ShapeGrid } from './ShapeGrid';
import { FullscreenOverlay, useOverlayFullscreen } from './FullscreenOverlay';

const DEGREE_LABELS = ['', 'I', 'IIm', 'IIIm', 'IV', 'V', 'VIm'];

function ExpandBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-2 py-1 rounded border border-bp-line text-bp-muted hover:text-bp-accent cursor-pointer transition-colors
                 [body.light_&]:border-lt-line [body.light_&]:text-lt-muted"
      title="Expand"
    >⛶</button>
  );
}

function App() {
  const [selectedKey, setSelectedKey] = useState<NoteName>('C');
  const [light, setLight] = useState(() => window.matchMedia('(prefers-color-scheme: light)').matches);

  useEffect(() => {
    document.body.classList.toggle('light', light);
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e: MediaQueryListEvent) => setLight(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [light]);

  const toggleTheme = useCallback(() => setLight(v => !v), []);

  const [showBarre, setShowBarre] = useState(() => localStorage.getItem('chordao:showBarre') !== 'false');
  const toggleBarre = useCallback(() => {
    setShowBarre(v => {
      localStorage.setItem('chordao:showBarre', String(!v));
      return !v;
    });
  }, []);

  const voicings = useMemo(() => generateVoicings(selectedKey), [selectedKey]);
  const grouped = useMemo(() => groupByDegree(voicings), [voicings]);
  const optimal = useMemo(() => findOptimalCombination(grouped), [grouped]);
  const optimalSet = useMemo(() => new Set(optimal.map(v => `${v.name}-${v.shapeOrigin}`)), [optimal]);

  const [activeDegree, setActiveDegree] = useState<number | null>(null);
  const toggleDegree = useCallback((d: number) => setActiveDegree(v => v === d ? null : d), []);
  const filteredVoicings = useMemo(() => activeDegree ? voicings.filter(v => v.degree === activeDegree) : voicings, [voicings, activeDegree]);
  const filteredOptimal = useMemo(() => activeDegree ? optimal.filter(v => v.degree === activeDegree) : optimal, [optimal, activeDegree]);

  const [gridFS, openGrid, closeGrid] = useOverlayFullscreen();
  const [fretFS, openFret, closeFret] = useOverlayFullscreen();
  const [chordFS, openChord, closeChord] = useOverlayFullscreen();
  const [activeChord, setActiveChord] = useState<ChordVoicing | null>(null);

  const handleChordDblClick = useCallback((v: ChordVoicing) => {
    setActiveChord(v);
    openChord();
  }, [openChord]);

  const handleCloseChord = useCallback(() => {
    closeChord();
    setActiveChord(null);
  }, [closeChord]);

  const sectionCard = `mb-4 md:mb-6 rounded-xl border border-bp-line bg-bp-surface p-3 md:p-4 shadow-lg transition-all duration-300
    [body.light_&]:bg-lt-surface [body.light_&]:border-lt-line [body.light_&]:shadow-md`;
  const sectionTitle = `text-sm font-semibold text-bp-muted tracking-wider uppercase [body.light_&]:text-lt-muted`;

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-bp-line bg-bp-surface p-3 md:p-4
                        flex flex-col gap-3 md:gap-4 transition-colors md:overflow-y-auto md:min-h-0
                        [body.light_&]:bg-lt-surface [body.light_&]:border-lt-line">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-bp-accent/20 [body.light_&]:bg-lt-accent/20 flex items-center justify-center shrink-0">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold tracking-wide leading-tight">Chordao</h1>
            <p className="text-[9px] text-bp-muted [body.light_&]:text-lt-muted leading-tight">Chord Visualizer</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={toggleBarre}
              className={`text-xs px-2 py-1 rounded border cursor-pointer transition-colors ${
                showBarre
                  ? 'border-bp-accent text-bp-accent [body.light_&]:border-lt-accent [body.light_&]:text-lt-accent'
                  : 'border-bp-line text-bp-muted [body.light_&]:border-lt-line [body.light_&]:text-lt-muted'
              }`}
              title="Toggle barre lines"
            >B</button>
            <button
              onClick={toggleTheme}
              className="text-xs px-2 py-1 rounded border border-bp-line text-bp-muted hover:text-bp-accent cursor-pointer transition-colors
                         [body.light_&]:border-lt-line [body.light_&]:text-lt-muted"
            >{light ? '🌙' : '☀️'}</button>
          </div>
        </div>

        <div className="grid grid-cols-6 md:grid-cols-4 gap-1">
          {NOTES.map(note => (
            <button
              key={note}
              onClick={() => setSelectedKey(note)}
              className={`px-1 py-1.5 rounded text-xs cursor-pointer transition-all duration-200 ${
                selectedKey === note
                  ? 'bg-bp-accent text-white font-bold shadow-[0_0_8px_var(--color-bp-accent)] [body.light_&]:shadow-[0_0_6px_var(--color-lt-accent)] [body.light_&]:bg-lt-accent'
                  : 'border border-bp-line text-bp-muted hover:border-bp-accent [body.light_&]:border-lt-line [body.light_&]:text-lt-muted'
              }`}
            >{note}</button>
          ))}
        </div>

        <div className="grid grid-cols-6 md:grid-cols-3 gap-1.5">
          {DEGREE_LABELS.slice(1).map((label, i) => {
            const deg = i + 1;
            const isActive = activeDegree === deg;
            const dimmed = activeDegree !== null && !isActive;
            return (
              <button
                key={label}
                onClick={() => toggleDegree(deg)}
                className={`px-2 py-1 rounded-full text-xs font-bold text-white cursor-pointer transition-all duration-200 ${dimmed ? 'opacity-25' : ''} ${isActive ? 'ring-2 ring-white/40 scale-105' : ''}`}
                style={{
                  background: `var(--color-deg-${deg})`,
                  boxShadow: isActive ? `0 0 10px var(--color-deg-${deg})` : 'none',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>


        <div className="hidden md:block mt-auto" />
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-0 p-3 md:p-6 overflow-y-auto">
        <section className={sectionCard}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={sectionTitle}>Shape Grid</h2>
            <ExpandBtn onClick={openGrid} />
          </div>
          <ShapeGrid voicings={filteredVoicings} optimal={filteredOptimal} light={light} />
        </section>

        <section className={sectionCard}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={sectionTitle}>Fretboard Overview</h2>
            <ExpandBtn onClick={openFret} />
          </div>
          <Fretboard voicings={filteredVoicings} optimal={filteredOptimal} light={light} />
        </section>

        <section className={sectionCard}>
          <h2 className={`${sectionTitle} mb-3`}>Chord Diagrams <span className="text-[10px] font-normal normal-case">(double-click to expand)</span></h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:flex md:flex-wrap gap-2 md:gap-4 justify-items-center">
            {[1, 2, 3, 4, 5, 6].map(degree => {
              const dv = grouped.get(degree) ?? [];
              return dv.map(v => (
                <ChordDiagram
                  key={`${v.name}-${v.shapeOrigin}`}
                  voicing={v}
                  highlighted={optimalSet.has(`${v.name}-${v.shapeOrigin}`)}
                  light={light}
                  showBarre={showBarre}
                  onDoubleClick={() => handleChordDblClick(v)}
                />
              ));
            })}
          </div>
        </section>
        {/* Footer removed from here, now at page bottom */}
      </main>
      </div>

      {/* Footer */}
      <footer className="shrink-0 relative border-t border-bp-line [body.light_&]:border-lt-line">
        <div className="h-px bg-gradient-to-r from-transparent via-bp-accent/40 to-transparent [body.light_&]:via-lt-accent/40" />
        <div className="py-3 flex items-center justify-center gap-2 text-[11px] text-bp-muted [body.light_&]:text-lt-muted flex-wrap">
          <span>Chordao</span>
          <span>·</span>
          <span>E/Em/A/Am shape derivation</span>
          <span>·</span>
          <a href="https://github.com/W-Mai/chordao" target="_blank" rel="noopener"
            className="text-bp-accent [body.light_&]:text-lt-accent hover:underline">GitHub</a>
          <span>·</span>
          <span>MIT</span>
        </div>
      </footer>

      {/* Fullscreen overlays */}
      <FullscreenOverlay active={gridFS} onClose={closeGrid}>
        <ShapeGrid voicings={filteredVoicings} optimal={filteredOptimal} light={light} />
      </FullscreenOverlay>

      <FullscreenOverlay active={fretFS} onClose={closeFret}>
        <Fretboard voicings={filteredVoicings} optimal={filteredOptimal} light={light} />
      </FullscreenOverlay>

      <FullscreenOverlay active={chordFS} onClose={handleCloseChord}>
        {activeChord && (
          <div className="flex items-center justify-center w-full h-full">
            <ChordDiagram
              voicing={activeChord}
              highlighted={optimalSet.has(`${activeChord.name}-${activeChord.shapeOrigin}`)}
              light={light}
              showBarre={showBarre}
              className="w-full max-w-[50vh]"
            />
          </div>
        )}
      </FullscreenOverlay>
    </div>
  );
}

export default App;
