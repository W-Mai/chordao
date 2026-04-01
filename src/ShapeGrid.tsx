import type { ChordVoicing } from './chordData';

const DEGREE_LABELS: Record<number, string> = { 1: '1', 2: '2m', 3: '3m', 4: '4', 5: '5', 6: '6m' };
const DEGREE_COLORS: Record<number, string> = {
  1: 'var(--color-deg-1)', 2: 'var(--color-deg-2)', 3: 'var(--color-deg-3)',
  4: 'var(--color-deg-4)', 5: 'var(--color-deg-5)', 6: 'var(--color-deg-6)',
};

interface ShapeGridProps {
  voicings: ChordVoicing[];
  optimal: ChordVoicing[];
  light?: boolean;
  totalFrets?: number;
}

export function ShapeGrid({ voicings, optimal, light = false, totalFrets = 12 }: ShapeGridProps) {
  const optimalSet = new Set(optimal.map(v => `${v.name}-${v.shapeOrigin}`));

  const rows = [
    { label: 'A / Am', shapes: ['A', 'Am'] },
    { label: 'E / Em', shapes: ['E', 'Em'] },
  ];

  type Cell = { degree: number; name: string; isOptimal: boolean };
  const grid: (Cell | null)[][] = rows.map(() => Array.from({ length: totalFrets + 1 }, () => null));

  for (const v of voicings) {
    const rowIdx = rows[0].shapes.includes(v.shapeOrigin) ? 0 : 1;
    const fret = v.barrePosition;
    if (fret >= 0 && fret <= totalFrets) {
      grid[rowIdx][fret] = {
        degree: v.degree,
        name: v.name,
        isOptimal: optimalSet.has(`${v.name}-${v.shapeOrigin}`),
      };
    }
  }

  const labelW = 56;
  const nutW = 4;
  const fretW = 52;
  const padX = 8;
  const stringGap = 40;
  const padY = 24;
  const boardW = totalFrets * fretW;
  const svgW = labelW + nutW + boardW + padX;
  const svgH = padY + stringGap + padY;
  const stringY = [padY, padY + stringGap];

  const fretLine = light ? '#c0c8d4' : '#2a4a6a';
  const boardBg = light ? '#f0ece4' : '#1a1408';
  const nutColor = light ? '#d4cfc2' : '#e0d6c2';
  const stringColor = light ? '#888' : '#aaa';
  const txt = light ? '#64748b' : '#5a7a9a';
  const dotMarker = light ? '#d8d0c0' : '#2a2010';

  // Inlay frets (relative to board)
  const singleDots = [3, 5, 7, 9];
  const doubleDot = 12;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: 600 }}>
        {/* Fretboard background */}
        <rect x={labelW} y={padY - 16} width={nutW + boardW} height={stringGap + 32} rx={4} fill={boardBg} />

        {/* Nut */}
        <rect x={labelW} y={padY - 16} width={nutW} height={stringGap + 32} rx={2} fill={nutColor} />

        {/* Fret wires */}
        {Array.from({ length: totalFrets }, (_, f) => {
          const x = labelW + nutW + (f + 1) * fretW;
          return <line key={f} x1={x} y1={padY - 16} x2={x} y2={padY + stringGap + 16} stroke={fretLine} strokeWidth={1.5} />;
        })}

        {/* Fret numbers */}
        {Array.from({ length: totalFrets }, (_, f) => {
          const x = labelW + nutW + f * fretW + fretW / 2;
          return (
            <text key={f} x={x} y={svgH - 2} textAnchor="middle" fontSize={8} fill={txt} fontFamily="monospace">
              {f + 1}
            </text>
          );
        })}

        {/* Inlay dots */}
        {singleDots.filter(f => f <= totalFrets).map(f => {
          const x = labelW + nutW + (f - 1) * fretW + fretW / 2;
          return <circle key={f} cx={x} cy={padY + stringGap / 2} r={4} fill={dotMarker} opacity={0.5} />;
        })}
        {doubleDot <= totalFrets && <>
          <circle cx={labelW + nutW + (doubleDot - 1) * fretW + fretW / 2} cy={padY + stringGap / 2 - 10} r={4} fill={dotMarker} opacity={0.5} />
          <circle cx={labelW + nutW + (doubleDot - 1) * fretW + fretW / 2} cy={padY + stringGap / 2 + 10} r={4} fill={dotMarker} opacity={0.5} />
        </>}

        {/* Strings */}
        {rows.map((row, ri) => (
          <g key={row.label}>
            {/* String label */}
            <text x={labelW - 6} y={stringY[ri] + 4} textAnchor="end" fontSize={10} fontWeight="bold" fill={txt} fontFamily="monospace">
              {row.label}
            </text>
            {/* String wire */}
            <line
              x1={labelW + nutW} y1={stringY[ri]}
              x2={labelW + nutW + boardW} y2={stringY[ri]}
              stroke={stringColor} strokeWidth={ri === 1 ? 2 : 1.2}
            />
          </g>
        ))}

        {/* Chord markers on strings */}
        {rows.map((_, ri) =>
          grid[ri].map((cell, fret) => {
            if (!cell) return null;
            // Position: center of the fret space, on the string
            const x = fret === 0
              ? labelW + nutW / 2
              : labelW + nutW + (fret - 1) * fretW + fretW / 2;
            const y = stringY[ri];
            const color = DEGREE_COLORS[cell.degree];
            const isOpt = cell.isOptimal;

            return (
              <g key={`${ri}-${fret}`}>
                {/* Dot */}
                <circle
                  cx={x} cy={y} r={isOpt ? 14 : 11}
                  fill={isOpt ? color : 'transparent'}
                  stroke={color}
                  strokeWidth={isOpt ? 0 : 2}
                  opacity={isOpt ? 0.9 : 0.4}
                />
                {/* Degree label */}
                <text
                  x={x} y={y - 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={isOpt ? 11 : 9} fontWeight={isOpt ? 'bold' : 'normal'}
                  fill={isOpt ? '#fff' : color}
                  opacity={isOpt ? 1 : 0.6}
                  fontFamily="monospace"
                >
                  {DEGREE_LABELS[cell.degree]}
                </text>
                {/* Chord name */}
                <text
                  x={x} y={y + 10}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={7}
                  fill={isOpt ? '#fff' : txt}
                  opacity={isOpt ? 0.85 : 0.4}
                >
                  {cell.name}
                </text>
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
}
