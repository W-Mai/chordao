import { useState, useMemo, useCallback } from 'react';
import { NOTES, generateVoicings, groupByDegree, findOptimalCombination, type NoteName } from './chordData';
import { ChordDiagram } from './ChordDiagram';
import { Fretboard } from './Fretboard';
import { ShapeGrid } from './ShapeGrid';

const DEGREE_LABELS = ['', 'I', 'IIm', 'IIIm', 'IV', 'V', 'VIm'];

function App() {
  const [selectedKey, setSelectedKey] = useState<NoteName>('C');
  const [light, setLight] = useState(false);

  const toggleTheme = useCallback(() => {
    setLight(v => {
      document.body.classList.toggle('light', !v);
      return !v;
    });
  }, []);

  const voicings = useMemo(() => generateVoicings(selectedKey), [selectedKey]);
  const grouped = useMemo(() => groupByDegree(voicings), [voicings]);
  const optimal = useMemo(() => findOptimalCombination(grouped), [grouped]);
  const optimalSet = useMemo(() => new Set(optimal.map(v => `${v.name}-${v.shapeOrigin}`)), [optimal]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-48 shrink-0 border-r border-bp-line bg-bp-surface p-4 flex flex-col gap-4 transition-colors
                        [body.light_&]:bg-lt-surface [body.light_&]:border-lt-line">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-wide">🎸 Chordao</h1>
          <button
            onClick={toggleTheme}
            className="text-xs px-2 py-1 rounded border border-bp-line text-bp-muted hover:text-bp-accent cursor-pointer transition-colors
                       [body.light_&]:border-lt-line [body.light_&]:text-lt-muted"
          >
            {light ? '🌙' : '☀️'}
          </button>
        </div>

        <p className="text-xs text-bp-muted [body.light_&]:text-lt-muted">Select Key</p>
        <div className="grid grid-cols-4 gap-1">
          {NOTES.map(note => (
            <button
              key={note}
              onClick={() => setSelectedKey(note)}
              className={`px-1 py-1.5 rounded text-xs cursor-pointer transition-all duration-200 ${
                selectedKey === note
                  ? 'bg-bp-accent text-white font-bold shadow-[0_0_8px_var(--color-bp-accent)] [body.light_&]:shadow-[0_0_6px_var(--color-lt-accent)] [body.light_&]:bg-lt-accent'
                  : 'border border-bp-line text-bp-muted hover:border-bp-accent [body.light_&]:border-lt-line [body.light_&]:text-lt-muted'
              }`}
            >
              {note}
            </button>
          ))}
        </div>

        {/* Degree legend */}
        <p className="text-xs text-bp-muted mt-2 [body.light_&]:text-lt-muted">Degrees</p>
        <div className="flex flex-col gap-1">
          {DEGREE_LABELS.slice(1).map((label, i) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: `var(--color-deg-${i + 1})` }} />
              <span className="text-bp-text [body.light_&]:text-lt-text">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto text-[10px] text-bp-muted [body.light_&]:text-lt-muted">
          E/Em/A/Am shape derivation
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Shape Grid */}
        <section className="mb-6 rounded-xl border border-bp-line bg-bp-surface p-4 shadow-lg transition-all duration-300
                            [body.light_&]:bg-lt-surface [body.light_&]:border-lt-line [body.light_&]:shadow-md">
          <h2 className="text-sm font-semibold text-bp-muted mb-3 tracking-wider uppercase [body.light_&]:text-lt-muted">
            Shape Grid
          </h2>
          <ShapeGrid voicings={voicings} optimal={optimal} light={light} />
        </section>

        {/* Fretboard */}
        <section className="mb-6 rounded-xl border border-bp-line bg-bp-surface p-4 shadow-lg transition-all duration-300
                            [body.light_&]:bg-lt-surface [body.light_&]:border-lt-line [body.light_&]:shadow-md">
          <h2 className="text-sm font-semibold text-bp-muted mb-3 tracking-wider uppercase [body.light_&]:text-lt-muted">
            Fretboard Overview
          </h2>
          <Fretboard voicings={voicings} optimal={optimal} light={light} />
        </section>

        {/* Chord Diagrams */}
        <section className="rounded-xl border border-bp-line bg-bp-surface p-4 shadow-lg transition-all duration-300
                            [body.light_&]:bg-lt-surface [body.light_&]:border-lt-line [body.light_&]:shadow-md">
          <h2 className="text-sm font-semibold text-bp-muted mb-3 tracking-wider uppercase [body.light_&]:text-lt-muted">
            Chord Diagrams
          </h2>
          <div className="flex flex-wrap gap-4">
            {[1, 2, 3, 4, 5, 6].map(degree => {
              const dv = grouped.get(degree) ?? [];
              return dv.map(v => (
                <ChordDiagram
                  key={`${v.name}-${v.shapeOrigin}`}
                  voicing={v}
                  highlighted={optimalSet.has(`${v.name}-${v.shapeOrigin}`)}
                  light={light}
                />
              ));
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
