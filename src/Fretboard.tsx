import type { ChordVoicing } from './chordData';

const DEGREE_COLORS = ['', 'var(--color-deg-1)', 'var(--color-deg-2)', 'var(--color-deg-3)', 'var(--color-deg-4)', 'var(--color-deg-5)', 'var(--color-deg-6)'];

const STRINGS = 6;
const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];
// Inlay marker frets
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
  const fw = 48;
  const ss = 18;
  const bw = fw * totalFrets;
  const bh = ss * (STRINGS - 1);
  const svgW = pad.left + bw + pad.right;
  const svgH = pad.top + bh + pad.bottom;

  const line = light ? '#cbd5e1' : '#1e3a5f';
  const str = light ? '#94a3b8' : '#2a4a6a';
  const txt = light ? '#64748b' : '#5a7a9a';
  const dotFill = light ? '#e2e8f0' : '#1a3050';

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: svgW }}>
        <g transform={`translate(${pad.left}, ${pad.top})`}>
          {/* String labels */}
          {STRING_LABELS.map((l, i) => (
            <text key={l} x={-14} y={i * ss + 4} fontSize={10} fill={txt} textAnchor="middle" fontFamily="monospace">{l}</text>
          ))}

          {/* Nut */}
          <line x1={0} y1={-4} x2={0} y2={bh + 4} stroke={light ? '#334155' : '#c8daf0'} strokeWidth={2.5} />

          {/* Frets + numbers */}
          {Array.from({ length: totalFrets }, (_, f) => {
            const x = (f + 1) * fw;
            return (
              <g key={f}>
                <line x1={x} y1={-4} x2={x} y2={bh + 4} stroke={line} strokeWidth={0.8} />
                <text x={x - fw / 2} y={bh + 16} fontSize={9} fill={txt} textAnchor="middle">{f + 1}</text>
              </g>
            );
          })}

          {/* Inlay dots */}
          {SINGLE_DOTS.filter(f => f <= totalFrets).map(f => (
            <circle key={f} cx={(f - 0.5) * fw} cy={bh + 30} r={3.5} fill={dotFill} />
          ))}
          {DOUBLE_DOT <= totalFrets && <>
            <circle cx={(DOUBLE_DOT - 0.5) * fw} cy={bh + 25} r={3.5} fill={dotFill} />
            <circle cx={(DOUBLE_DOT - 0.5) * fw} cy={bh + 35} r={3.5} fill={dotFill} />
          </>}

          {/* Strings */}
          {Array.from({ length: STRINGS }, (_, i) => (
            <line key={i} x1={0} y1={i * ss} x2={bw} y2={i * ss} stroke={str} strokeWidth={0.8 + i * 0.25} />
          ))}

          {/* Chord dots */}
          {voicings.map(v => {
            const isOpt = optimalSet.has(`${v.name}-${v.shapeOrigin}`);
            const color = DEGREE_COLORS[v.degree];
            return v.frets.map((fret, si) => {
              if (fret <= 0) return null;
              const x = (fret - 0.5) * fw;
              const y = si * ss;
              return (
                <circle
                  key={`${v.name}-${v.shapeOrigin}-${si}`}
                  cx={x} cy={y} r={6}
                  fill={isOpt ? color : 'transparent'}
                  stroke={color}
                  strokeWidth={isOpt ? 0 : 1.5}
                  opacity={isOpt ? 0.9 : 0.3}
                />
              );
            });
          })}
        </g>
      </svg>
    </div>
  );
}
