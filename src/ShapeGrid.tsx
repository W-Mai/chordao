import { voicingKey, type ChordVoicing } from './chordData';

const DEGREE_LABELS: Record<number, string> = { 1: '1', 2: '2m', 3: '3m', 4: '4', 5: '5', 6: '6m' };
const DEGREE_COLORS: Record<number, string> = {
  1: 'var(--color-deg-1)',
  2: 'var(--color-deg-2)',
  3: 'var(--color-deg-3)',
  4: 'var(--color-deg-4)',
  5: 'var(--color-deg-5)',
  6: 'var(--color-deg-6)',
};

interface ShapeGridProps {
  voicings: ChordVoicing[];
  optimal: ChordVoicing[];
  light?: boolean;
  totalFrets?: number;
  hoveredChord?: string | null;
  onHoverChord?: (key: string | null) => void;
  onClickChord?: (key: string) => void;
  progressionDegrees?: number[];
}

export function ShapeGrid({
  voicings,
  optimal,
  light = false,
  totalFrets = 17,
  hoveredChord,
  onHoverChord,
  onClickChord,
  progressionDegrees,
}: ShapeGridProps) {
  const optimalSet = new Set(optimal.map(voicingKey));

  const rows = [
    { label: 'A / Am', shapes: ['A', 'Am'] },
    { label: 'E / Em', shapes: ['E', 'Em'] },
  ];

  type Cell = { degree: number; name: string; isOptimal: boolean; key: string };
  const grid: (Cell | null)[][] = rows.map(() => Array.from({ length: totalFrets + 1 }, () => null));

  for (const v of voicings) {
    const rowIdx = rows[0].shapes.includes(v.shapeOrigin) ? 0 : 1;
    const fret = v.barrePosition;
    if (fret >= 0 && fret <= totalFrets) {
      grid[rowIdx][fret] = {
        degree: v.degree,
        name: v.name,
        isOptimal: optimalSet.has(voicingKey(v)),
        key: voicingKey(v),
      };
    }
  }

  const labelW = 56;
  const nutW = 5;
  const openW = 40; // dedicated space for open position before nut
  const fretW = 52;
  const boardW = totalFrets * fretW;
  const stringGap = 52;
  const padY = 28;
  const svgW = labelW + openW + nutW + boardW + 8;
  const svgH = padY + stringGap + padY + 16; // extra for fret numbers
  const stringY = [padY, padY + stringGap];
  const boardX = labelW + openW + nutW;

  const fretLine = light ? '#b0b8c4' : '#2a3a5a';
  const boardBg = light ? '#e6e1d6' : '#1a1408';
  const nutColor = light ? '#c8c0b0' : '#e0d6c2';
  const stringColors = light ? ['#999', '#777'] : ['#999', '#bbb'];
  const txt = light ? '#6c6f85' : '#7f849c';
  const dotMarker = light ? '#b0a488' : '#4a3c20';

  const singleDots = [3, 5, 7, 9];
  const doubleDot = 12;
  const dotR = 13;

  function cellX(fret: number): number {
    if (fret === 0) return labelW + openW / 2;
    return boardX + (fret - 1) * fretW + fretW / 2;
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: 600 }}>
        {/* Fretboard wood */}
        <rect
          x={boardX - nutW}
          y={stringY[0] - 20}
          width={nutW + boardW}
          height={stringGap + 40}
          rx={3}
          fill={boardBg}
        />

        {/* Nut */}
        <rect x={boardX - nutW} y={stringY[0] - 20} width={nutW} height={stringGap + 40} rx={1.5} fill={nutColor} />

        {/* Fret wires */}
        {Array.from({ length: totalFrets }, (_, f) => {
          const x = boardX + (f + 1) * fretW;
          return (
            <line key={f} x1={x} y1={stringY[0] - 20} x2={x} y2={stringY[1] + 20} stroke={fretLine} strokeWidth={1.5} />
          );
        })}

        {/* Inlay dots between strings */}
        {singleDots
          .filter((f) => f <= totalFrets)
          .map((f) => (
            <circle
              key={f}
              cx={boardX + (f - 1) * fretW + fretW / 2}
              cy={padY + stringGap / 2}
              r={3.5}
              fill={dotMarker}
            />
          ))}
        {doubleDot <= totalFrets && (
          <>
            <circle
              cx={boardX + (doubleDot - 1) * fretW + fretW / 2}
              cy={padY + stringGap / 2 - 10}
              r={3.5}
              fill={dotMarker}
            />
            <circle
              cx={boardX + (doubleDot - 1) * fretW + fretW / 2}
              cy={padY + stringGap / 2 + 10}
              r={3.5}
              fill={dotMarker}
            />
          </>
        )}

        {/* Strings */}
        {rows.map((row, ri) => (
          <g key={row.label}>
            <text
              x={labelW - 6}
              y={stringY[ri] + 4}
              textAnchor="end"
              fontSize={10}
              fontWeight="bold"
              fill={txt}
              fontFamily="monospace"
            >
              {row.label}
            </text>
            <line
              x1={boardX}
              y1={stringY[ri]}
              x2={boardX + boardW}
              y2={stringY[ri]}
              stroke={stringColors[ri]}
              strokeWidth={ri === 1 ? 2.2 : 1.2}
            />
          </g>
        ))}

        {/* Fret numbers */}
        {Array.from({ length: totalFrets }, (_, f) => (
          <text
            key={f}
            x={boardX + f * fretW + fretW / 2}
            y={svgH - 2}
            textAnchor="middle"
            fontSize={9}
            fill={txt}
            fontFamily="monospace"
          >
            {f + 1}
          </text>
        ))}

        {/* Chord markers */}
        {rows.map((_row, ri) =>
          grid[ri].map((cell, fret) => {
            if (!cell) return null;
            const x = cellX(fret);
            const y = stringY[ri];
            const color = DEGREE_COLORS[cell.degree];
            const isOpt = cell.isOptimal;
            const r = dotR;
            const chordKey = cell.key;
            const isHov = hoveredChord === chordKey;
            const dimmed = hoveredChord != null && !isHov;

            return (
              <g
                key={cell.key}
                opacity={dimmed ? 0.15 : 1}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.2s',
                  cursor: 'pointer',
                }}
                onPointerEnter={() => onHoverChord?.(chordKey)}
                onPointerLeave={() => onHoverChord?.(null)}
                onClick={() => onClickChord?.(chordKey)}
              >
                <circle
                  cx={0}
                  cy={0}
                  r={r}
                  fill={(hoveredChord == null ? isOpt : isHov) ? color : boardBg}
                  stroke={color}
                  strokeWidth={(hoveredChord == null ? isOpt : isHov) ? 0 : 2}
                  opacity={(hoveredChord == null ? isOpt : isHov) ? 0.9 : 0.7}
                />
                <text
                  x={0}
                  y={-3}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight="bold"
                  fill={(hoveredChord == null ? isOpt : isHov) ? '#fff' : color}
                  fontFamily="monospace"
                >
                  {DEGREE_LABELS[cell.degree]}
                </text>
                <text
                  x={0}
                  y={7}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={6.5}
                  fontWeight="bold"
                  fill={(hoveredChord == null ? isOpt : isHov) ? 'rgba(255,255,255,0.8)' : color}
                  opacity={isOpt || isHov ? 1 : 0.7}
                >
                  {cell.name}
                </text>
              </g>
            );
          }),
        )}
        {/* Progression path with animated dot */}
        {progressionDegrees && progressionDegrees.length > 1 && (() => {
          const optMap = new Map(optimal.map(v => [v.degree, v]));
          const steps: { x: number; y: number; deg: number }[] = [];
          for (const deg of progressionDegrees) {
            const v = optMap.get(deg);
            if (!v) continue;
            const rowIdx = rows[0].shapes.includes(v.shapeOrigin) ? 0 : 1;
            steps.push({ x: cellX(v.barrePosition), y: stringY[rowIdx], deg });
          }
          if (steps.length < 2) return null;

          // Build closed loop path (last → first to close)
          const allPts = [...steps, steps[0]];
          const pathD = allPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

          return (
            <g>
              {/* Path line */}
              <path d={pathD} fill="none" stroke="var(--blue)" strokeWidth={1.5} opacity={0.2}
                strokeDasharray="4 3" />

              {/* Animated glow dot traveling along path */}
              <circle r={5} fill="var(--blue)" opacity={0.8}>
                <animateMotion dur={`${allPts.length * 0.8}s`} repeatCount="indefinite" path={pathD} />
              </circle>
              <circle r={10} fill="var(--blue)" opacity={0.15}>
                <animateMotion dur={`${allPts.length * 0.8}s`} repeatCount="indefinite" path={pathD} />
              </circle>

              {/* Step numbers */}
              {steps.map((s, i) => (
                <g key={`step-${i}`}>
                  <circle cx={s.x} cy={s.y - dotR - 8} r={7} fill="var(--blue)" opacity={0.15} />
                  <text x={s.x} y={s.y - dotR - 5}
                    textAnchor="middle" fontSize={8} fontWeight="bold"
                    fill="var(--blue)" opacity={0.9}
                  >{i + 1}</text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
