import type { ChordVoicing } from './chordData';

const DEGREE_COLORS = ['', 'var(--color-deg-1)', 'var(--color-deg-2)', 'var(--color-deg-3)', 'var(--color-deg-4)', 'var(--color-deg-5)', 'var(--color-deg-6)'];

const STRINGS = 6;
const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];
const SINGLE_DOTS = [3, 5, 7, 9, 15];
const DOUBLE_DOT = 12;

interface FretboardProps {
  voicings: ChordVoicing[];
  optimal: ChordVoicing[];
  light?: boolean;
  totalFrets?: number;
}

export function Fretboard({ voicings, optimal, light = false, totalFrets = 15 }: FretboardProps) {
  const optimalSet = new Set(optimal.map(v => `${v.name}-${v.shapeOrigin}`));

  const pad = { top: 28, left: 28, right: 16, bottom: 44 };
  const nutW = 5;
  const fw = 48;
  const ss = 18;
  const bw = fw * totalFrets;
  const bh = ss * (STRINGS - 1);
  const svgW = pad.left + nutW + bw + pad.right;
  const svgH = pad.top + bh + pad.bottom;

  const boardBg = light ? '#f0ece4' : '#1a1408';
  const nutColor = light ? '#d4cfc2' : '#e0d6c2';
  const fretLine = light ? '#c0c8d4' : '#2a4a6a';
  const dotMarker = light ? '#c4b89c' : '#4a3c20';
  const txt = light ? '#64748b' : '#5a7a9a';

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: svgW }}>
        <g transform={`translate(${pad.left}, ${pad.top})`}>
          {/* String labels */}
          {STRING_LABELS.map((l, i) => (
            <text key={l} x={-14} y={i * ss + 4} fontSize={10} fill={txt} textAnchor="middle" fontFamily="monospace">{l}</text>
          ))}

          {/* Fretboard wood */}
          <rect x={0} y={-8} width={nutW + bw} height={bh + 16} rx={3} fill={boardBg} />

          {/* Nut */}
          <rect x={0} y={-8} width={nutW} height={bh + 16} rx={1.5} fill={nutColor} />

          {/* Fret wires */}
          {Array.from({ length: totalFrets }, (_, f) => {
            const x = nutW + (f + 1) * fw;
            return (
              <g key={f}>
                <line x1={x} y1={-8} x2={x} y2={bh + 8} stroke={fretLine} strokeWidth={1.5} />
                <text x={x - fw / 2} y={bh + 16} fontSize={9} fill={txt} textAnchor="middle" fontFamily="monospace">{f + 1}</text>
              </g>
            );
          })}

          {/* Inlay dots */}
          {SINGLE_DOTS.filter(f => f <= totalFrets).map(f => (
            <circle key={f} cx={nutW + (f - 0.5) * fw} cy={bh + 30} r={3.5} fill={dotMarker} />
          ))}
          {DOUBLE_DOT <= totalFrets && <>
            <circle cx={nutW + (DOUBLE_DOT - 0.5) * fw} cy={bh + 25} r={3.5} fill={dotMarker} />
            <circle cx={nutW + (DOUBLE_DOT - 0.5) * fw} cy={bh + 35} r={3.5} fill={dotMarker} />
          </>}

          {/* Strings */}
          {Array.from({ length: STRINGS }, (_, i) => (
            <line key={i} x1={nutW} y1={i * ss} x2={nutW + bw} y2={i * ss}
              stroke={light ? '#999' : '#aaa'} strokeWidth={0.8 + i * 0.3} />
          ))}

          {/* Chord dots */}
          {voicings.map(v => {
            const isOpt = optimalSet.has(`${v.name}-${v.shapeOrigin}`);
            const color = DEGREE_COLORS[v.degree];
            return v.frets.map((fret, si) => {
              if (fret <= 0) return null;
              const x = nutW + (fret - 0.5) * fw;
              const y = si * ss;
              return (
                <circle
                  key={`${v.name}-${v.shapeOrigin}-${si}`}
                  cx={x} cy={y} r={6}
                  fill={isOpt ? color : boardBg}
                  stroke={color}
                  strokeWidth={isOpt ? 0 : 1.5}
                  opacity={isOpt ? 0.9 : 0.5}
                />
              );
            });
          })}
        </g>
      </svg>
    </div>
  );
}
