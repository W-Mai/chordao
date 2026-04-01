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

  const cols = totalFrets + 1;
  const cellW = 56;
  const cellH = 48;
  const labelW = 60;
  const headerH = 20;
  const gap = 3;
  const svgW = labelW + cols * (cellW + gap);
  const svgH = headerH + 2 * (cellH + gap);

  const line = light ? '#e2e8f0' : '#1e3a5f';
  const cellBg = light ? '#f8fafc' : '#0d1f38';
  const txt = light ? '#64748b' : '#5a7a9a';
  const sub = light ? '#94a3b8' : '#4a6a8a';

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: 600 }}>
        {/* Column headers */}
        {Array.from({ length: cols }, (_, f) => {
          const x = labelW + f * (cellW + gap);
          return (
            <text key={f} x={x + cellW / 2} y={headerH - 5} textAnchor="middle" fontSize={9} fill={txt} fontFamily="monospace">
              {f === 0 ? 'open' : f}
            </text>
          );
        })}

        {/* Rows */}
        {rows.map((row, ri) => {
          const y = headerH + ri * (cellH + gap);
          return (
            <g key={row.label}>
              {/* Row label */}
              <text x={labelW - 6} y={y + cellH / 2 + 4} textAnchor="end" fontSize={10} fontWeight="bold" fill={txt} fontFamily="monospace">
                {row.label}
              </text>

              {/* Cells */}
              {grid[ri].map((cell, fret) => {
                const x = labelW + fret * (cellW + gap);
                const isOpt = cell?.isOptimal ?? false;
                const color = cell ? DEGREE_COLORS[cell.degree] : '';
                const bg = isOpt ? `color-mix(in srgb, ${color} 18%, ${cellBg})` : cellBg;

                return (
                  <g key={fret}>
                    <rect x={x} y={y} width={cellW} height={cellH} rx={6} fill={bg} stroke={line} strokeWidth={0.8} />
                    {cell && (
                      <>
                        <text
                          x={x + cellW / 2} y={y + cellH / 2 - 2}
                          textAnchor="middle" fontSize={14} fontWeight={isOpt ? 'bold' : 'normal'}
                          fill={color} opacity={isOpt ? 1 : 0.45} fontFamily="monospace"
                        >
                          {DEGREE_LABELS[cell.degree]}
                        </text>
                        <text
                          x={x + cellW / 2} y={y + cellH / 2 + 12}
                          textAnchor="middle" fontSize={9} fill={sub} opacity={isOpt ? 0.8 : 0.4}
                        >
                          {cell.name}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
