import type { ChordVoicing } from '../data/chordData';

const STRINGS = 6;
const FRETS_SHOWN = 4;
const DEGREE_LABELS = ['', 'I', 'IIm', 'IIIm', 'IV', 'V', 'VIm'];

interface ChordDiagramProps {
  voicing: ChordVoicing;
  highlighted?: boolean;
  dimmed?: boolean;
  light?: boolean;
  onDoubleClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onClick?: () => void;
  className?: string;
  showBarre?: boolean;
}

const VB_W = 140;
const VB_H = 154;

export function ChordDiagram({
  voicing,
  highlighted = false,
  dimmed = false,
  light: _light = false,
  onDoubleClick,
  onPointerEnter,
  onPointerLeave,
  onClick,
  className = 'w-full max-w-[140px]',
  showBarre = false,
}: ChordDiagramProps) {
  const pad = { top: 36, left: 26, right: 12, bottom: 16 };
  const bw = VB_W - pad.left - pad.right;
  const bh = VB_H - pad.top - pad.bottom;
  const ss = bw / (STRINGS - 1);
  const fs = bh / FRETS_SHOWN;

  const played = voicing.frets.filter((f) => f > 0);
  const minFret = played.length > 0 ? Math.min(...played) : 1;
  const maxFret = played.length > 0 ? Math.max(...played) : 1;
  // Ensure all fretted notes fit within FRETS_SHOWN window
  const startFret = maxFret <= FRETS_SHOWN ? 1 : minFret;

  const accent = `var(--color-deg-${voicing.degree})`;
  const line = 'var(--surface0)';
  const str = 'var(--overlay0)';
  const txt = 'var(--text)';
  const muted = 'var(--overlay1)';
  const bg = highlighted ? 'var(--glow-blue)' : 'var(--base)';

  const borderStyle = highlighted ? `2px solid ${accent}` : `1px solid var(--panel-border)`;

  // Detect barre: find the lowest fret that appears on multiple consecutive strings
  // A barre spans from the first to last string that shares the minimum fret
  let barreInfo: { fret: number; fromStr: number; toStr: number } | null = null;
  if (showBarre && played.length > 0) {
    const barreFret = Math.min(...played);
    // Only strings exactly on the barre fret count
    const stringsOnBarre = voicing.frets.map((f, i) => ({ f, i })).filter(({ f }) => f === barreFret);
    if (stringsOnBarre.length >= 2) {
      barreInfo = {
        fret: barreFret,
        fromStr: stringsOnBarre[0].i,
        toStr: stringsOnBarre[stringsOnBarre.length - 1].i,
      };
    }
  }

  return (
    <div
      onDoubleClick={onDoubleClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
      className={`cursor-pointer rounded-[8%] overflow-hidden ${className}`}
      style={{ border: borderStyle, background: bg, opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.2s' }}
    >
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto block">
        <text x={VB_W / 2} y={14} textAnchor="middle" fontSize={12} fontWeight="bold" fill={txt}>
          {voicing.name}
        </text>
        <text x={VB_W / 2} y={26} textAnchor="middle" fontSize={9} fill={muted}>
          {DEGREE_LABELS[voicing.degree]} · {voicing.shapeOrigin}
        </text>
        <g transform={`translate(${pad.left}, ${pad.top})`}>
          {startFret === 1 ? (
            <line x1={0} y1={0} x2={bw} y2={0} stroke={txt} strokeWidth={2.5} />
          ) : (
            <text x={-14} y={fs / 2 + 3} fontSize={9} fill={muted} textAnchor="middle">
              {startFret}
            </text>
          )}
          {Array.from({ length: FRETS_SHOWN + 1 }, (_, i) => (
            <line key={i} x1={0} y1={i * fs} x2={bw} y2={i * fs} stroke={line} strokeWidth={0.8} />
          ))}
          {Array.from({ length: STRINGS }, (_, i) => (
            <line key={i} x1={i * ss} y1={0} x2={i * ss} y2={bh} stroke={str} strokeWidth={0.8} />
          ))}

          {/* Barre bar */}
          {barreInfo &&
            (() => {
              const rf = barreInfo.fret - startFret;
              if (rf < 0 || rf >= FRETS_SHOWN) return null;
              const y = rf * fs + fs / 2;
              const x1 = barreInfo.fromStr * ss;
              const x2 = barreInfo.toStr * ss;
              return (
                <rect
                  x={x1 - 5.5}
                  y={y - 5.5}
                  width={x2 - x1 + 11}
                  height={11}
                  rx={5.5}
                  fill={accent}
                  opacity={highlighted ? 1 : 0.6}
                />
              );
            })()}

          {/* Finger dots */}
          {voicing.frets.map((fret, si) => {
            const x = si * ss;
            if (fret === -1)
              return (
                <text key={si} x={x} y={-6} textAnchor="middle" fontSize={10} fill={muted}>
                  ×
                </text>
              );
            if (fret === 0)
              return <circle key={si} cx={x} cy={-6} r={3.5} fill="none" stroke={muted} strokeWidth={1.2} />;
            const rf = fret - startFret;
            if (rf < 0 || rf >= FRETS_SHOWN) return null;
            // Skip individual dot if it's on the barre fret and barre is shown
            if (showBarre && barreInfo && fret === barreInfo.fret && si >= barreInfo.fromStr && si <= barreInfo.toStr)
              return null;
            return (
              <circle key={si} cx={x} cy={rf * fs + fs / 2} r={5.5} fill={accent} opacity={highlighted ? 1 : 0.6} />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
