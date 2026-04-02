import { useState, useCallback } from 'react';
import { voicingKey, type ChordVoicing } from './chordData';

const DEGREE_COLORS = [
  '',
  'var(--color-deg-1)',
  'var(--color-deg-2)',
  'var(--color-deg-3)',
  'var(--color-deg-4)',
  'var(--color-deg-5)',
  'var(--color-deg-6)',
];
const DEGREE_LABELS = ['', '1', '2m', '3m', '4', '5', '6m'];

const STRINGS = 6;
const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'];
const SINGLE_DOTS = [3, 5, 7, 9, 15, 17];
const DOUBLE_DOT = 12;

interface FretboardProps {
  voicings: ChordVoicing[];
  optimal: ChordVoicing[];
  light?: boolean;
  totalFrets?: number;
  hoveredChord?: string | null;
  onHoverChord?: (key: string | null) => void;
  onClickChord?: (key: string) => void;
}

export function Fretboard({
  voicings,
  optimal: _optimal,
  light = false,
  totalFrets = 17,
  hoveredChord,
  onHoverChord,
  onClickChord,
}: FretboardProps) {
  const [localHover, setLocalHover] = useState<string | null>(null);
  const hovered = hoveredChord ?? localHover;

  const vKey = voicingKey;

  const handleEnter = useCallback(
    (key: string) => {
      setLocalHover(key);
      onHoverChord?.(key);
    },
    [onHoverChord],
  );
  const handleLeave = useCallback(() => {
    setLocalHover(null);
    onHoverChord?.(null);
  }, [onHoverChord]);

  const labelW = 56;
  const nutW = 5;
  const fw = 52;
  const ss = 18;
  const bw = fw * totalFrets;
  const bh = ss * (STRINGS - 1);
  const padY = 16;
  const svgW = labelW + nutW + bw + 8;
  const svgH = padY + bh + padY + 20;
  const r = 7;

  const boardBg = light ? '#e6e1d6' : '#1a1408';
  const nutColor = light ? '#c8c0b0' : '#e0d6c2';
  const fretLine = light ? '#b0b8c4' : '#2a3a5a';
  const dotMarker = light ? '#b0a488' : '#4a3c20';
  const txt = light ? '#6c6f85' : '#7f849c';

  // Compute dot positions per voicing for outline lines
  function getPoints(v: ChordVoicing): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [];
    v.frets.forEach((fret, si) => {
      if (fret <= 0) return;
      pts.push({ x: nutW + (fret - 0.5) * fw, y: (STRINGS - 1 - si) * ss });
    });
    return pts;
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-auto md:w-full" style={{ height: 'auto', minWidth: svgW }}>
        <g transform={`translate(${labelW}, ${padY})`}>
          {/* String labels */}
          {STRING_LABELS.map((l, i) => (
            <text key={l} x={-6} y={i * ss + 4} fontSize={10} fill={txt} textAnchor="end" fontFamily="monospace">
              {l}
            </text>
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
                <text x={x - fw / 2} y={bh + 18} fontSize={11} fill={txt} textAnchor="middle" fontFamily="monospace">
                  {f + 1}
                </text>
              </g>
            );
          })}

          {/* Inlay dots (between strings, inside fretboard) */}
          {SINGLE_DOTS.filter((f) => f <= totalFrets).map((f) => (
            <circle key={f} cx={nutW + (f - 0.5) * fw} cy={bh / 2} r={3} fill={dotMarker} />
          ))}
          {DOUBLE_DOT <= totalFrets && (
            <>
              <circle cx={nutW + (DOUBLE_DOT - 0.5) * fw} cy={bh / 2 - ss * 0.8} r={3} fill={dotMarker} />
              <circle cx={nutW + (DOUBLE_DOT - 0.5) * fw} cy={bh / 2 + ss * 0.8} r={3} fill={dotMarker} />
            </>
          )}

          {/* Strings */}
          {Array.from({ length: STRINGS }, (_, i) => (
            <line
              key={i}
              x1={nutW}
              y1={i * ss}
              x2={nutW + bw}
              y2={i * ss}
              stroke={light ? '#888' : '#aaa'}
              strokeWidth={0.8 + i * 0.3}
            />
          ))}

          {/* Chord outline + dots */}
          {voicings.map((v) => {
            const key = vKey(v);
            const isHov = hovered === key;
            const dimmed = hovered != null && !isHov;
            const color = DEGREE_COLORS[v.degree];
            const pts = getPoints(v);
            const isEShape = v.shapeOrigin.startsWith('E');
            const active = isHov;

            return (
              <g
                key={vKey(v)}
                opacity={dimmed ? 0.12 : 1}
                style={{ transition: 'opacity 0.2s' }}
                onPointerEnter={() => handleEnter(key)}
                onPointerLeave={handleLeave}
                onClick={() => onClickChord?.(key)}
                className="cursor-pointer"
              >
                {/* Outline connecting played strings */}
                {active && pts.length >= 2 && (
                  <polyline
                    points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    opacity={0.4}
                    strokeLinejoin="round"
                  />
                )}

                {/* Dots: circle for E shape, rounded rect for A shape, barre bar only when active */}
                {(() => {
                  type Dot = { fret: number; si: number; x: number; y: number };
                  const dots: Dot[] = [];
                  v.frets.forEach((fret, si) => {
                    if (fret <= 0) return;
                    dots.push({ fret, si, x: nutW + (fret - 0.5) * fw, y: (STRINGS - 1 - si) * ss });
                  });

                  if (!active) {
                    // Non-active: just draw individual small dots
                    return dots.map((d, i) => (
                      <g
                        key={`dot-${i}`}
                        style={{
                          transform: `translate(${d.x}px, ${d.y}px)`,
                          transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
                        }}
                      >
                        {isEShape ? (
                          <circle cx={0} cy={0} r={r} fill={boardBg} stroke={color} strokeWidth={1.5} opacity={0.5} />
                        ) : (
                          <rect
                            x={-r}
                            y={-r}
                            width={r * 2}
                            height={r * 2}
                            rx={2.5}
                            fill={boardBg}
                            stroke={color}
                            strokeWidth={1.5}
                            opacity={0.5}
                          />
                        )}
                      </g>
                    ));
                  }

                  // Active: merge consecutive same-fret into barre bars
                  const rendered = new Set<number>();
                  const elements: React.ReactNode[] = [];

                  for (let i = 0; i < dots.length; i++) {
                    if (rendered.has(i)) continue;
                    let j = i + 1;
                    while (j < dots.length && dots[j].fret === dots[i].fret && dots[j].si === dots[j - 1].si + 1) {
                      j++;
                    }
                    const span = j - i;
                    if (span >= 2) {
                      const first = dots[i];
                      const last = dots[j - 1];
                      const barX = first.x;
                      const y1 = Math.min(first.y, last.y);
                      const y2 = Math.max(first.y, last.y);
                      elements.push(
                        <g
                          key={`bar-${i}`}
                          style={{
                            transform: `translate(${barX}px, ${y1}px)`,
                            transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
                          }}
                        >
                          <rect
                            x={-r}
                            y={-r}
                            width={r * 2}
                            height={y2 - y1 + r * 2}
                            rx={r}
                            fill={color}
                            opacity={0.9}
                          />
                          <text
                            x={0}
                            y={(y2 - y1) / 2 + 0.5}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={7}
                            fontWeight="bold"
                            fill="#fff"
                            fontFamily="monospace"
                          >
                            {DEGREE_LABELS[v.degree]}
                          </text>
                        </g>,
                      );
                      for (let k = i; k < j; k++) rendered.add(k);
                    } else {
                      const d = dots[i];
                      rendered.add(i);
                      elements.push(
                        <g
                          key={`dot-${i}`}
                          style={{
                            transform: `translate(${d.x}px, ${d.y}px)`,
                            transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
                          }}
                        >
                          {isEShape ? (
                            <circle cx={0} cy={0} r={r} fill={color} opacity={0.9} />
                          ) : (
                            <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={2.5} fill={color} opacity={0.9} />
                          )}
                          <text
                            x={0}
                            y={0.5}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={7}
                            fontWeight="bold"
                            fill="#fff"
                            fontFamily="monospace"
                          >
                            {DEGREE_LABELS[v.degree]}
                          </text>
                        </g>,
                      );
                    }
                  }
                  return elements;
                })()}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
