import type { ChordVoicing } from './chordData';

// SVG-based chord diagram component
interface ChordDiagramProps {
  voicing: ChordVoicing;
  highlighted?: boolean;
  size?: number;
}

const STRINGS = 6;
const FRETS_SHOWN = 4;

export function ChordDiagram({ voicing, highlighted = false, size = 160 }: ChordDiagramProps) {
  const padding = { top: 40, left: 30, right: 15, bottom: 20 };
  const width = size;
  const height = size * 1.1;
  const fretboardW = width - padding.left - padding.right;
  const fretboardH = height - padding.top - padding.bottom;
  const stringSpacing = fretboardW / (STRINGS - 1);
  const fretSpacing = fretboardH / FRETS_SHOWN;

  const playedFrets = voicing.frets.filter(f => f > 0);
  const minFret = playedFrets.length > 0 ? Math.min(...playedFrets) : 1;
  // Show from fret 1 if all within first 4 frets, otherwise shift
  const startFret = minFret <= FRETS_SHOWN ? 1 : minFret;

  const degreeLabels = ['', 'I', 'IIm', 'IIIm', 'IV', 'V', 'VIm'];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        border: highlighted ? '2px solid #4a9eff' : '1px solid #ddd',
        borderRadius: 8,
        background: highlighted ? '#f0f7ff' : '#fafafa',
      }}
    >
      {/* Chord name */}
      <text x={width / 2} y={16} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#333">
        {voicing.name}
      </text>
      {/* Degree + shape info */}
      <text x={width / 2} y={30} textAnchor="middle" fontSize={10} fill="#888">
        {degreeLabels[voicing.degree]} · {voicing.shapeOrigin} shape
      </text>

      <g transform={`translate(${padding.left}, ${padding.top})`}>
        {/* Nut or fret number */}
        {startFret === 1 ? (
          <line x1={0} y1={0} x2={fretboardW} y2={0} stroke="#333" strokeWidth={3} />
        ) : (
          <text x={-18} y={fretSpacing / 2 + 4} fontSize={10} fill="#666" textAnchor="middle">
            {startFret}fr
          </text>
        )}

        {/* Fret lines */}
        {Array.from({ length: FRETS_SHOWN + 1 }, (_, i) => (
          <line
            key={`fret-${i}`}
            x1={0} y1={i * fretSpacing}
            x2={fretboardW} y2={i * fretSpacing}
            stroke="#ccc" strokeWidth={1}
          />
        ))}

        {/* String lines */}
        {Array.from({ length: STRINGS }, (_, i) => (
          <line
            key={`str-${i}`}
            x1={i * stringSpacing} y1={0}
            x2={i * stringSpacing} y2={fretboardH}
            stroke="#999" strokeWidth={1}
          />
        ))}

        {/* Finger dots / mute / open markers */}
        {voicing.frets.map((fret, strIdx) => {
          const x = strIdx * stringSpacing;
          if (fret === -1) {
            // Muted string
            return (
              <text key={strIdx} x={x} y={-8} textAnchor="middle" fontSize={12} fill="#999">
                ×
              </text>
            );
          }
          if (fret === 0) {
            // Open string
            return (
              <circle key={strIdx} cx={x} cy={-8} r={4} fill="none" stroke="#666" strokeWidth={1.5} />
            );
          }
          // Fretted note
          const relFret = fret - startFret;
          if (relFret < 0 || relFret >= FRETS_SHOWN) return null;
          const y = relFret * fretSpacing + fretSpacing / 2;
          return (
            <circle
              key={strIdx}
              cx={x} cy={y} r={6}
              fill={highlighted ? '#4a9eff' : '#333'}
            />
          );
        })}
      </g>
    </svg>
  );
}
