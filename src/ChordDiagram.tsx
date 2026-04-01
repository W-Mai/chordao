import type { ChordVoicing } from './chordData';

const STRINGS = 6;
const FRETS_SHOWN = 4;
const DEGREE_LABELS = ['', 'I', 'IIm', 'IIIm', 'IV', 'V', 'VIm'];

interface ChordDiagramProps {
  voicing: ChordVoicing;
  highlighted?: boolean;
  light?: boolean;
  size?: number;
  onDoubleClick?: () => void;
}

export function ChordDiagram({ voicing, highlighted = false, light = false, size = 140, onDoubleClick }: ChordDiagramProps) {
  const pad = { top: 36, left: 26, right: 12, bottom: 16 };
  const w = size;
  const h = size * 1.1;
  const bw = w - pad.left - pad.right;
  const bh = h - pad.top - pad.bottom;
  const ss = bw / (STRINGS - 1);
  const fs = bh / FRETS_SHOWN;

  const played = voicing.frets.filter(f => f > 0);
  const minFret = played.length > 0 ? Math.min(...played) : 1;
  const startFret = minFret <= FRETS_SHOWN ? 1 : minFret;

  const accent = `var(--color-deg-${voicing.degree})`;
  const line = light ? '#cbd5e1' : '#1e3a5f';
  const str = light ? '#94a3b8' : '#3a5a7a';
  const txt = light ? '#334155' : '#c8daf0';
  const muted = light ? '#94a3b8' : '#5a7a9a';
  const bg = highlighted ? (light ? '#f0f4ff' : '#0f2040') : (light ? '#ffffff' : '#0a1628');
  const border = highlighted ? accent : line;

  return (
    <div onDoubleClick={onDoubleClick} className="cursor-pointer">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[140px]">
        <rect x={0} y={0} width={w} height={h} rx={10} fill={bg} stroke={border} strokeWidth={highlighted ? 2 : 1} />
        <text x={w / 2} y={14} textAnchor="middle" fontSize={12} fontWeight="bold" fill={txt}>{voicing.name}</text>
        <text x={w / 2} y={26} textAnchor="middle" fontSize={9} fill={muted}>
          {DEGREE_LABELS[voicing.degree]} · {voicing.shapeOrigin}
        </text>
        <g transform={`translate(${pad.left}, ${pad.top})`}>
          {startFret === 1 ? (
            <line x1={0} y1={0} x2={bw} y2={0} stroke={txt} strokeWidth={2.5} />
          ) : (
            <text x={-14} y={fs / 2 + 3} fontSize={9} fill={muted} textAnchor="middle">{startFret}</text>
          )}
          {Array.from({ length: FRETS_SHOWN + 1 }, (_, i) => (
            <line key={i} x1={0} y1={i * fs} x2={bw} y2={i * fs} stroke={line} strokeWidth={0.8} />
          ))}
          {Array.from({ length: STRINGS }, (_, i) => (
            <line key={i} x1={i * ss} y1={0} x2={i * ss} y2={bh} stroke={str} strokeWidth={0.8} />
          ))}
          {voicing.frets.map((fret, si) => {
            const x = si * ss;
            if (fret === -1) return <text key={si} x={x} y={-6} textAnchor="middle" fontSize={10} fill={muted}>×</text>;
            if (fret === 0) return <circle key={si} cx={x} cy={-6} r={3.5} fill="none" stroke={muted} strokeWidth={1.2} />;
            const rf = fret - startFret;
            if (rf < 0 || rf >= FRETS_SHOWN) return null;
            return <circle key={si} cx={x} cy={rf * fs + fs / 2} r={5.5} fill={accent} opacity={highlighted ? 1 : 0.6} />;
          })}
        </g>
      </svg>
    </div>
  );
}
