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

  const border = light ? '#e2e8f0' : '#1e3a5f';
  const cellBg = light ? '#f8fafc' : '#0a1628';
  const labelColor = light ? '#64748b' : '#5a7a9a';
  const subColor = light ? '#94a3b8' : '#4a6a8a';

  return (
    <div className="overflow-x-auto">
      <table style={{ borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
        <thead>
          <tr>
            <th style={{ padding: '4px 8px', textAlign: 'right', color: labelColor, fontSize: 10 }}>Shape</th>
            {Array.from({ length: totalFrets + 1 }, (_, f) => (
              <th key={f} style={{ width: 52, minWidth: 52, textAlign: 'center', color: labelColor, fontSize: 10, padding: 3 }}>
                {f === 0 ? 'open' : f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.label}>
              <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold', color: labelColor, whiteSpace: 'nowrap', fontSize: 11 }}>
                {row.label}
              </td>
              {grid[ri].map((cell, fret) => (
                <td key={fret} style={{
                  width: 52, height: 38, textAlign: 'center', verticalAlign: 'middle',
                  border: `1px solid ${border}`,
                  background: cell?.isOptimal ? `color-mix(in srgb, ${DEGREE_COLORS[cell.degree]} 15%, ${cellBg})` : cellBg,
                  transition: 'background 0.2s',
                }}>
                  {cell && (
                    <div style={{
                      fontWeight: cell.isOptimal ? 'bold' : 'normal',
                      color: DEGREE_COLORS[cell.degree],
                      opacity: cell.isOptimal ? 1 : 0.45,
                      lineHeight: 1.2,
                      transition: 'opacity 0.2s',
                    }}>
                      <div style={{ fontSize: 13 }}>{DEGREE_LABELS[cell.degree]}</div>
                      <div style={{ fontSize: 9, color: subColor }}>{cell.name}</div>
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
