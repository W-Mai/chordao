import { useState, useMemo } from 'react';
import { NOTES, generateVoicings, groupByDegree, findOptimalCombination, type NoteName } from './chordData';
import { ChordDiagram } from './ChordDiagram';
import { Fretboard } from './Fretboard';
import { ShapeGrid } from './ShapeGrid';

const DEGREE_LABELS = ['', 'I', 'IIm', 'IIIm', 'IV', 'V', 'VIm'];

function App() {
  const [selectedKey, setSelectedKey] = useState<NoteName>('C');

  const voicings = useMemo(() => generateVoicings(selectedKey), [selectedKey]);
  const grouped = useMemo(() => groupByDegree(voicings), [voicings]);
  const optimal = useMemo(() => findOptimalCombination(grouped), [grouped]);
  const optimalSet = useMemo(() => new Set(optimal.map(v => `${v.name}-${v.shapeOrigin}`)), [optimal]);

  return (
    <div className="max-w-4xl mx-auto p-5 font-sans">
      <h1 className="text-2xl mb-1">🎸 Chordao</h1>
      <p className="text-gray-500 mb-5 text-sm">
        Based on E/Em/A/Am shapes · Highlighted = optimal movement path
      </p>

      {/* Key selector */}
      <div className="flex gap-1.5 flex-wrap mb-6">
        {NOTES.map(note => (
          <button
            key={note}
            onClick={() => setSelectedKey(note)}
            className={`px-3.5 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
              selectedKey === note
                ? 'border-2 border-blue-400 bg-blue-50 font-bold'
                : 'border border-gray-300 bg-white hover:bg-gray-50'
            }`}
          >
            {note}
          </button>
        ))}
      </div>

      {/* Shape grid */}
      <h2 className="text-lg mb-3 text-gray-600">Shape Grid</h2>
      <ShapeGrid voicings={voicings} optimal={optimal} />

      {/* Fretboard */}
      <h2 className="text-lg mb-3 text-gray-600">Fretboard Overview</h2>
      <Fretboard voicings={voicings} optimal={optimal} />

      {/* Chord diagrams by degree */}
      {[1, 2, 3, 4, 5, 6].map(degree => {
        const dv = grouped.get(degree) ?? [];
        return (
          <div key={degree} className="mb-5">
            <h3 className="text-base text-gray-500 mb-2">
              {DEGREE_LABELS[degree]} — {dv[0]?.name}
            </h3>
            <div className="flex gap-3 flex-wrap">
              {dv.map(v => (
                <ChordDiagram
                  key={`${v.name}-${v.shapeOrigin}`}
                  voicing={v}
                  highlighted={optimalSet.has(`${v.name}-${v.shapeOrigin}`)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default App;
