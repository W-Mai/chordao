import { voicingKey, type ChordVoicing } from '../data/chordData';

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
  onDblClickChord?: (key: string) => void;
  progressionDegrees?: number[];
  animated?: boolean;
  animationDuration?: number; // total loop duration in seconds
  activeStep?: number; // current step index for synced playback
  hideLabels?: boolean;
  monoColor?: boolean;
}

export function ShapeGrid({
  voicings,
  optimal,
  light = false,
  totalFrets = 17,
  hoveredChord,
  onHoverChord,
  onClickChord,
  onDblClickChord,
  progressionDegrees,
  animated = true,
  animationDuration,
  activeStep,
  hideLabels = false,
  monoColor = false,
}: ShapeGridProps) {
  const optimalSet = new Set(optimal.map(voicingKey));

  // Determine rows dynamically based on shapes present
  const shapeNames = new Set(voicings.map((v) => v.shapeOrigin));
  const hasCaged =
    shapeNames.has('C') ||
    shapeNames.has('Cm') ||
    shapeNames.has('G') ||
    shapeNames.has('Gm') ||
    shapeNames.has('D') ||
    shapeNames.has('Dm');
  const rows = hasCaged
    ? [
        { label: 'A / C', shapes: ['A', 'Am', 'C', 'Cm'] },
        { label: 'E / G', shapes: ['E', 'Em', 'G', 'Gm'] },
        { label: 'D', shapes: ['D', 'Dm'] },
      ]
    : [
        { label: 'A / Am', shapes: ['A', 'Am'] },
        { label: 'E / Em', shapes: ['E', 'Em'] },
      ];

  type Cell = { degree: number; name: string; isOptimal: boolean; key: string };
  const grid: Cell[][][] = rows.map(() => Array.from({ length: totalFrets + 1 }, () => []));

  for (const v of voicings) {
    const rowIdx = rows.findIndex((r) => r.shapes.includes(v.shapeOrigin));
    if (rowIdx < 0) continue;
    const fret = v.barrePosition;
    if (fret >= 0 && fret <= totalFrets) {
      grid[rowIdx][fret].push({
        degree: v.degree,
        name: v.name,
        isOptimal: optimalSet.has(voicingKey(v)),
        key: voicingKey(v),
      });
    }
  }

  const labelW = 56;
  const nutW = 5;
  const openW = 40; // dedicated space for open position before nut
  const fretW = 52;
  const boardW = totalFrets * fretW;
  const stringGap = 70;
  const padY = 22;
  const rowCount = rows.length;
  const svgW = labelW + openW + nutW + boardW + 8;
  const svgH = padY + stringGap * (rowCount - 1) + padY + 20;
  const stringY = Array.from({ length: rowCount }, (_, i) => padY + i * stringGap);
  const boardX = labelW + openW + nutW;

  const fretLine = light ? '#b0b8c4' : '#2a3a5a';
  const boardBg = light ? '#e6e1d6' : '#1a1408';
  const nutColor = light ? '#c8c0b0' : '#e0d6c2';
  const stringColors = light ? ['#999', '#777', '#888'] : ['#999', '#bbb', '#aaa'];
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
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-auto md:w-full" style={{ height: 'auto', minWidth: svgW }}>
        {/* Fretboard wood */}
        <rect
          x={boardX - nutW}
          y={stringY[0] - 20}
          width={nutW + boardW}
          height={stringGap * (rowCount - 1) + 40}
          rx={3}
          fill={boardBg}
        />

        {/* Nut */}
        <rect
          x={boardX - nutW}
          y={stringY[0] - 20}
          width={nutW}
          height={stringGap * (rowCount - 1) + 40}
          rx={1.5}
          fill={nutColor}
        />

        {/* Fret wires */}
        {Array.from({ length: totalFrets }, (_, f) => {
          const x = boardX + (f + 1) * fretW;
          return (
            <line
              key={f}
              x1={x}
              y1={stringY[0] - 20}
              x2={x}
              y2={stringY[rowCount - 1] + 20}
              stroke={fretLine}
              strokeWidth={1.5}
            />
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
              strokeWidth={ri === rowCount - 1 ? 2.2 : 1.2}
            />
          </g>
        ))}

        {/* Fret numbers */}
        {Array.from({ length: totalFrets }, (_, f) => (
          <text
            key={f}
            x={boardX + f * fretW + fretW / 2}
            y={svgH - 3}
            textAnchor="middle"
            fontSize={11}
            fill={txt}
            fontFamily="monospace"
          >
            {f + 1}
          </text>
        ))}

        {/* Chord markers */}
        {rows.map((_row, ri) =>
          grid[ri].map((cells, fret) => {
            if (cells.length === 0) return null;
            const x = cellX(fret);
            const baseY = stringY[ri];

            return cells.map((cell, ci) => {
              const smallR = dotR - 3;
              const xOffset = cells.length > 1 ? (ci - (cells.length - 1) / 2) * (smallR * 2 + 2) : 0;
              const y = baseY;
              const color = monoColor ? 'var(--overlay0)' : DEGREE_COLORS[cell.degree];
              const isOpt = cell.isOptimal;
              const r = cells.length > 1 ? smallR : dotR;
              const chordKey = cell.key;
              const isHov = hoveredChord === chordKey;
              const dimmed = hoveredChord != null && !isHov;

              return (
                <g
                  key={cell.key}
                  opacity={dimmed ? 0.15 : 1}
                  style={{
                    transform: `translate(${x + xOffset}px, ${y}px)`,
                    transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.2s',
                    cursor: 'pointer',
                  }}
                  onPointerEnter={() => onHoverChord?.(chordKey)}
                  onPointerLeave={() => onHoverChord?.(null)}
                  onClick={() => onClickChord?.(chordKey)}
                  onDoubleClick={() => onDblClickChord?.(chordKey)}
                >
                  <circle
                    cx={0}
                    cy={0}
                    r={r}
                    fill={(hoveredChord == null ? isOpt : isHov) ? (monoColor ? 'var(--blue)' : color) : boardBg}
                    stroke={color}
                    strokeWidth={(hoveredChord == null ? isOpt : isHov) ? 0 : 2}
                    opacity={(hoveredChord == null ? isOpt : isHov) ? 0.9 : 0.7}
                  />
                  {!hideLabels && (
                    <>
                      <text
                        x={0}
                        y={-3}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={cells.length > 1 ? 8 : 10}
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
                        fontSize={cells.length > 1 ? 5 : 6.5}
                        fontWeight="bold"
                        fill={(hoveredChord == null ? isOpt : isHov) ? 'rgba(255,255,255,0.8)' : color}
                        opacity={isOpt || isHov ? 1 : 0.7}
                      >
                        {cell.name}
                      </text>
                    </>
                  )}
                </g>
              );
            });
          }),
        )}
        {/* Progression path with animated dot */}
        {progressionDegrees &&
          progressionDegrees.length > 1 &&
          (() => {
            const optMap = new Map(optimal.map((v) => [v.degree, v]));
            const steps: { x: number; y: number; deg: number; multi: boolean }[] = [];
            for (const deg of progressionDegrees) {
              const v = optMap.get(deg);
              if (!v) continue;
              const rowIdx = rows.findIndex((r) => r.shapes.includes(v.shapeOrigin));
              const fret = v.barrePosition;
              const cellsAtPos = fret >= 0 && fret <= totalFrets ? grid[rowIdx][fret] : [];
              const ci = cellsAtPos.findIndex((c) => c.key === voicingKey(v));
              const smallR = dotR - 3;
              const xOff = cellsAtPos.length > 1 ? (ci - (cellsAtPos.length - 1) / 2) * (smallR * 2 + 2) : 0;
              steps.push({ x: cellX(fret) + xOff, y: stringY[rowIdx], deg, multi: cellsAtPos.length > 1 });
            }
            if (steps.length < 2) return null;

            // Build closed loop path (last → first to close)
            const allPts = [...steps, steps[0]];
            const pathD = allPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

            return (
              <g>
                {/* Path line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--blue)"
                  strokeWidth={1.5}
                  opacity={0.2}
                  strokeDasharray="4 3"
                />

                {/* Animated glow dot traveling along path */}
                {animated && activeStep == null && (
                  <>
                    <circle r={5} fill="var(--blue)" opacity={0.8}>
                      <animateMotion
                        dur={`${animationDuration ?? allPts.length * 0.8}s`}
                        repeatCount="indefinite"
                        path={pathD}
                      />
                    </circle>
                    <circle r={10} fill="var(--blue)" opacity={0.15}>
                      <animateMotion
                        dur={`${animationDuration ?? allPts.length * 0.8}s`}
                        repeatCount="indefinite"
                        path={pathD}
                      />
                    </circle>
                  </>
                )}

                {/* Synced dot for playback */}
                {activeStep != null &&
                  steps[activeStep % steps.length] &&
                  (() => {
                    const p = steps[activeStep % steps.length];
                    const circleR = p.multi ? dotR - 3 + 4 : dotR + 4;
                    return (
                      <circle
                        cx={0}
                        cy={0}
                        r={circleR}
                        fill="none"
                        stroke="var(--blue)"
                        strokeWidth={2.5}
                        opacity={0.9}
                        style={{
                          transform: `translate(${p.x}px, ${p.y}px)`,
                          transition: 'transform 0.15s ease',
                          willChange: 'transform',
                        }}
                      />
                    );
                  })()}

                {/* Step numbers — group by position, spread horizontally */}
                {(() => {
                  const posKey = (s: { x: number; y: number }) => `${s.x},${s.y}`;
                  const groups = new Map<string, number[]>();
                  steps.forEach((s, i) => {
                    const k = posKey(s);
                    const arr = groups.get(k) ?? [];
                    arr.push(i);
                    groups.set(k, arr);
                  });
                  const midY = (stringY[0] + stringY[rowCount - 1]) / 2;
                  const elements: React.ReactNode[] = [];
                  for (const [, indices] of groups) {
                    const s = steps[indices[0]];
                    const isTop = s.y < midY;
                    const numY = isTop ? s.y + dotR + 10 : s.y - dotR - 10;
                    const numTextY = isTop ? s.y + dotR + 13 : s.y - dotR - 7;
                    const count = indices.length;
                    const spacing = 16;
                    const totalW = (count - 1) * spacing;
                    indices.forEach((idx, j) => {
                      const offsetX = -totalW / 2 + j * spacing;
                      elements.push(
                        <g key={`step-${idx}`}>
                          <circle cx={s.x + offsetX} cy={numY} r={7} fill="var(--blue)" opacity={0.15} />
                          <text
                            x={s.x + offsetX}
                            y={numTextY}
                            textAnchor="middle"
                            fontSize={8}
                            fontWeight="bold"
                            fill="var(--blue)"
                            opacity={0.9}
                          >
                            {idx + 1}
                          </text>
                        </g>,
                      );
                    });
                  }
                  return elements;
                })()}
              </g>
            );
          })()}
      </svg>
    </div>
  );
}
