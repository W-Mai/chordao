import type { ChordVoicing } from './chordData';

// Degree colors for visual distinction
const DEGREE_COLORS = ['', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];
const DEGREE_LABELS = ['', 'I', 'IIm', 'IIIm', 'IV', 'V', 'VIm'];

interface FretboardProps {
  voicings: ChordVoicing[];
  optimal: ChordVoicing[];
  totalFrets?: number;
}

const STRINGS = 6;
const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];

export function Fretboard({ voicings, optimal, totalFrets = 15 }: FretboardProps) {
  const optimalSet = new Set(optimal.map(v => `${v.name}-${v.shapeOrigin}`));

  const padding = { top: 30, left: 30, right: 20, bottom: 50 };
  const fretWidth = 50;
  const stringSpacing = 20;
  const boardW = fretWidth * totalFrets;
  const boardH = stringSpacing * (STRINGS - 1);
  const svgW = padding.left + boardW + padding.right;
  const svgH = padding.top + boardH + padding.bottom;

  return (
    <div style={{ overflowX: 'auto', marginBottom: 24 }}>
      <svg width={svgW} height={svgH} style={{ minWidth: svgW }}>
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* String labels */}
          {STRING_LABELS.map((label, i) => (
            <text key={label} x={-16} y={i * stringSpacing + 4} fontSize={11} fill="#666" textAnchor="middle">
              {label}
            </text>
          ))}

          {/* Nut */}
          <line x1={0} y1={-4} x2={0} y2={boardH + 4} stroke="#333" strokeWidth={3} />

          {/* Fret lines + numbers */}
          {Array.from({ length: totalFrets }, (_, f) => {
            const x = (f + 1) * fretWidth;
            return (
              <g key={f}>
                <line x1={x} y1={-4} x2={x} y2={boardH + 4} stroke="#ccc" strokeWidth={1} />
                <text x={x - fretWidth / 2} y={boardH + 18} fontSize={10} fill="#999" textAnchor="middle">
                  {f + 1}
                </text>
              </g>
            );
          })}

          {/* Fret markers (dots) */}
          {[3, 5, 7, 9, 15].map(f => (
            <circle key={f} cx={(f - 0.5) * fretWidth} cy={boardH + 30} r={3} fill="#ddd" />
          ))}
          {/* Double dot at 12 */}
          <circle cx={11.5 * fretWidth} cy={boardH + 26} r={3} fill="#ddd" />
          <circle cx={11.5 * fretWidth} cy={boardH + 34} r={3} fill="#ddd" />

          {/* Strings */}
          {Array.from({ length: STRINGS }, (_, i) => (
            <line
              key={i}
              x1={0} y1={i * stringSpacing}
              x2={boardW} y2={i * stringSpacing}
              stroke="#bbb" strokeWidth={1 + i * 0.3}
            />
          ))}

          {/* Chord dots */}
          {voicings.map(v => {
            const isOptimal = optimalSet.has(`${v.name}-${v.shapeOrigin}`);
            const color = DEGREE_COLORS[v.degree];
            return v.frets.map((fret, strIdx) => {
              if (fret <= 0) return null;
              const x = (fret - 0.5) * fretWidth;
              const y = strIdx * stringSpacing;
              return (
                <circle
                  key={`${v.name}-${v.shapeOrigin}-${strIdx}`}
                  cx={x} cy={y} r={7}
                  fill={isOptimal ? color : 'transparent'}
                  stroke={color}
                  strokeWidth={isOptimal ? 0 : 2}
                  opacity={isOptimal ? 0.9 : 0.4}
                />
              );
            });
          })}
        </g>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8, paddingLeft: padding.left }}>
        {DEGREE_LABELS.slice(1).map((label, i) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <span style={{
              display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
              background: DEGREE_COLORS[i + 1],
            }} />
            {label}
            <span style={{ color: '#999', fontSize: 11 }}>
              (filled = optimal)
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
