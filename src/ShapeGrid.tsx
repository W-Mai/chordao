import type { ChordVoicing } from './chordData';

const DEGREE_LABELS: Record<number, string> = { 1: '1', 2: '2m', 3: '3m', 4: '4', 5: '5', 6: '6m' };
const DEGREE_COLORS: Record<number, string> = {
  1: '#e74c3c', 2: '#e67e22', 3: '#f1c40f', 4: '#2ecc71', 5: '#3498db', 6: '#9b59b6',
};

interface ShapeGridProps {
  voicings: ChordVoicing[];
  optimal: ChordVoicing[];
  totalFrets?: number;
}

export function ShapeGrid({ voicings, optimal, totalFrets = 12 }: ShapeGridProps) {
  const optimalSet = new Set(optimal.map(v => `${v.name}-${v.shapeOrigin}`));

  // Group by shape row: E/Em → row 1 (bottom), A/Am → row 0 (top)
  // For each voicing, the "barre fret" is the baseFret (lowest played fret), 0 means open
  const rows: { label: string; shapes: string[] }[] = [
    { label: 'A / Am', shapes: ['A', 'Am'] },
    { label: 'E / Em', shapes: ['E', 'Em'] },
  ];

  // Build a lookup: row index → fret → voicing info
  type Cell = { degree: number; name: string; isOptimal: boolean };
  const grid: (Cell | null)[][] = rows.map(() => Array.from({ length: totalFrets + 1 }, () => null));

  for (const v of voicings) {
    const rowIdx = rows[0].shapes.includes(v.shapeOrigin) ? 0 : 1;
    // baseFret → use barrePosition for column placement
    const fret = v.barrePosition;
    if (fret >= 0 && fret <= totalFrets) {
      grid[rowIdx][fret] = {
        degree: v.degree,
        name: v.name,
        isOptimal: optimalSet.has(`${v.name}-${v.shapeOrigin}`),
      };
    }
  }

  const cellSize = 56;

  return (
    <div style={{ overflowX: 'auto', marginBottom: 24 }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 13, fontFamily: 'system-ui, sans-serif' }}>
        <thead>
          <tr>
            <th style={{ padding: '4px 8px', textAlign: 'right', color: '#999', fontSize: 11 }}>Shape</th>
            {Array.from({ length: totalFrets + 1 }, (_, f) => (
              <th key={f} style={{ width: cellSize, minWidth: cellSize, textAlign: 'center', color: '#aaa', fontSize: 11, padding: 4 }}>
                {f === 0 ? 'open' : f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={row.label}>
              <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold', color: '#555', whiteSpace: 'nowrap', fontSize: 12 }}>
                {row.label}
              </td>
              {grid[rowIdx].map((cell, fret) => (
                <td key={fret} style={{
                  width: cellSize, height: 40, textAlign: 'center', verticalAlign: 'middle',
                  border: '1px solid #eee',
                  background: cell?.isOptimal ? `${DEGREE_COLORS[cell.degree]}18` : '#fafafa',
                }}>
                  {cell && (
                    <div style={{
                      fontWeight: cell.isOptimal ? 'bold' : 'normal',
                      color: DEGREE_COLORS[cell.degree],
                      opacity: cell.isOptimal ? 1 : 0.5,
                      lineHeight: 1.2,
                    }}>
                      <div style={{ fontSize: 14 }}>{DEGREE_LABELS[cell.degree]}</div>
                      <div style={{ fontSize: 10, color: '#888' }}>{cell.name}</div>
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
