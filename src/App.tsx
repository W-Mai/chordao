import { useState, useMemo } from 'react';
import { NOTES, generateVoicings, groupByDegree, findOptimalCombination, type NoteName } from './chordData';
import { ChordDiagram } from './ChordDiagram';
import { Fretboard } from './Fretboard';
import { ShapeGrid } from './ShapeGrid';
import './App.css';

function App() {
  const [selectedKey, setSelectedKey] = useState<NoteName>('C');

  const voicings = useMemo(() => generateVoicings(selectedKey), [selectedKey]);
  const grouped = useMemo(() => groupByDegree(voicings), [voicings]);
  const optimal = useMemo(() => findOptimalCombination(grouped), [grouped]);

  const optimalSet = useMemo(() => new Set(optimal.map(v => `${v.name}-${v.shapeOrigin}`)), [optimal]);

  const degreeLabels = ['', 'I', 'IIm', 'IIIm', 'IV', 'V', 'VIm'];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>🎸 Chordao</h1>
      <p style={{ color: '#666', marginBottom: 20 }}>
        Based on E/Em/A/Am shapes · Highlighted = optimal movement path
      </p>

      {/* Key selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {NOTES.map(note => (
          <button
            key={note}
            onClick={() => setSelectedKey(note)}
            style={{
              padding: '6px 14px',
              border: selectedKey === note ? '2px solid #4a9eff' : '1px solid #ccc',
              borderRadius: 6,
              background: selectedKey === note ? '#e8f2ff' : '#fff',
              fontWeight: selectedKey === note ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {note}
          </button>
        ))}
      </div>

      {/* Shape grid (simplified 2-row view) */}
      <h2 style={{ fontSize: 18, marginBottom: 12, color: '#444' }}>Shape Grid</h2>
      <ShapeGrid voicings={voicings} optimal={optimal} />

      {/* Full fretboard view */}
      <h2 style={{ fontSize: 18, marginBottom: 12, color: '#444' }}>Fretboard Overview</h2>
      <Fretboard voicings={voicings} optimal={optimal} />

      {/* Chord grid by degree */}
      {[1, 2, 3, 4, 5, 6].map(degree => {
        const degreVoicings = grouped.get(degree) ?? [];
        return (
          <div key={degree} style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, color: '#555', marginBottom: 8 }}>
              {degreeLabels[degree]} — {degreVoicings[0]?.name}
            </h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {degreVoicings.map(v => (
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
