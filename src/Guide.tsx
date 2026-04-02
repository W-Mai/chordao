import { useState, useCallback } from 'react';

const STEPS = [
  {
    title: 'E Shape & A Shape',
    desc: 'Every chord derives from two open forms moved up the neck with a barre. The Shape Grid shows both on a mini fretboard.',
    svg: (
      <svg viewBox="0 0 320 80" className="w-full">
        {/* Mini fretboard bg */}
        <rect x={80} y={10} width={230} height={60} rx={3} fill="#1a1408" />
        <rect x={80} y={10} width={4} height={60} rx={1} fill="#e0d6c2" />
        {/* Two strings */}
        <line x1={84} y1={28} x2={310} y2={28} stroke="#aaa" strokeWidth={1} />
        <line x1={84} y1={52} x2={310} y2={52} stroke="#aaa" strokeWidth={1.5} />
        {/* Labels */}
        <text x={76} y={32} textAnchor="end" fontSize={9} fill="#7f849c" fontFamily="monospace">A / Am</text>
        <text x={76} y={56} textAnchor="end" fontSize={9} fill="#7f849c" fontFamily="monospace">E / Em</text>
        {/* Example dots */}
        <circle cx={120} cy={28} r={10} fill="#f38ba8" />
        <text x={120} y={31} textAnchor="middle" fontSize={8} fill="#fff" fontWeight="bold">1</text>
        <rect x={170} y={42} width={20} height={20} rx={3} fill="#89b4fa" />
        <text x={180} y={55} textAnchor="middle" fontSize={8} fill="#fff" fontWeight="bold">5</text>
        <circle cx={240} cy={52} r={10} fill="transparent" stroke="#a6e3a1" strokeWidth={2} />
        <text x={240} y={55} textAnchor="middle" fontSize={8} fill="#a6e3a1">4</text>
      </svg>
    ),
  },
  {
    title: 'Circle = E shape, Square = A shape',
    desc: 'On the fretboard view, circles represent E/Em shapes and squares represent A/Am shapes, so you can tell them apart at a glance.',
    svg: (
      <svg viewBox="0 0 200 60" className="w-full">
        <circle cx={50} cy={30} r={14} fill="#89b4fa" />
        <text x={50} y={34} textAnchor="middle" fontSize={10} fill="#fff" fontWeight="bold">E</text>
        <rect x={116} y={16} width={28} height={28} rx={4} fill="#cba6f7" />
        <text x={130} y={34} textAnchor="middle" fontSize={10} fill="#fff" fontWeight="bold">A</text>
      </svg>
    ),
  },
  {
    title: 'Filled = Recommended, Outlined = Alternative',
    desc: 'The app finds the optimal combination with minimum hand movement. Filled markers are the recommended set; outlined ones are other available positions.',
    svg: (
      <svg viewBox="0 0 280 60" className="w-full">
        {/* Filled */}
        <circle cx={50} cy={30} r={14} fill="#a6e3a1" />
        <text x={50} y={34} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="bold">4</text>
        <text x={50} y={55} textAnchor="middle" fontSize={8} fill="#7f849c">optimal</text>
        {/* Outlined */}
        <circle cx={140} cy={30} r={14} fill="transparent" stroke="#a6e3a1" strokeWidth={2} opacity={0.5} />
        <text x={140} y={34} textAnchor="middle" fontSize={9} fill="#a6e3a1" opacity={0.5}>4</text>
        <text x={140} y={55} textAnchor="middle" fontSize={8} fill="#7f849c">alternative</text>
        {/* Arrow */}
        <text x={95} y={34} textAnchor="middle" fontSize={14} fill="#7f849c">→</text>
        {/* Dimmed */}
        <circle cx={230} cy={30} r={14} fill="transparent" stroke="#f9e2af" strokeWidth={2} opacity={0.15} />
        <text x={230} y={34} textAnchor="middle" fontSize={9} fill="#f9e2af" opacity={0.15}>3</text>
        <text x={230} y={55} textAnchor="middle" fontSize={8} fill="#7f849c">dimmed</text>
      </svg>
    ),
  },
  {
    title: 'Reading a Chord Diagram',
    desc: 'Vertical lines = strings (low E to high e). Horizontal lines = frets. Dots = press here. A bar across = barre. × = mute that string. ○ = play open.',
    svg: (
      <svg viewBox="0 0 140 130" className="w-full max-w-[180px] mx-auto">
        <text x={70} y={12} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#cdd6f4">Am</text>
        {/* Nut */}
        <rect x={25} y={22} width={90} height={3} rx={1} fill="#e0d6c2" />
        {/* Frets */}
        {[0,1,2,3,4].map(i => <line key={i} x1={25} y1={25+i*22} x2={115} y2={25+i*22} stroke="#313244" strokeWidth={0.8} />)}
        {/* Strings */}
        {[0,1,2,3,4,5].map(i => <line key={i} x1={25+i*18} y1={25} x2={25+i*18} y2={113} stroke="#6c7086" strokeWidth={0.8} />)}
        {/* × muted */}
        <text x={25} y={18} textAnchor="middle" fontSize={10} fill="#7f849c">×</text>
        {/* ○ open */}
        <circle cx={43} cy={18} r={4} fill="none" stroke="#7f849c" strokeWidth={1.2} />
        <circle cx={115} cy={18} r={4} fill="none" stroke="#7f849c" strokeWidth={1.2} />
        {/* Dots */}
        <circle cx={61} cy={36} r={6} fill="#cba6f7" />
        <circle cx={79} cy={47} r={6} fill="#cba6f7" />
        <circle cx={97} cy={47} r={6} fill="#cba6f7" />
        {/* Labels */}
        <text x={70} y={125} textAnchor="middle" fontSize={8} fill="#7f849c">× = mute · ○ = open · ● = press</text>
      </svg>
    ),
  },
  {
    title: 'Colors = Scale Degrees',
    desc: 'Each color represents a scale degree. Hover or click any chord to highlight it across all views simultaneously.',
    svg: (
      <svg viewBox="0 0 280 40" className="w-full">
        {['I','IIm','IIIm','IV','V','VIm'].map((label, i) => (
          <g key={label}>
            <circle cx={25 + i * 44} cy={16} r={12} fill={`var(--color-deg-${i+1})`} />
            <text x={25 + i * 44} y={20} textAnchor="middle" fontSize={8} fill="#fff" fontWeight="bold">{label}</text>
          </g>
        ))}
      </svg>
    ),
  },
];

export function Guide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const toggle = useCallback(() => { setOpen(v => !v); setStep(0); }, []);

  const s = STEPS[step];

  return (
    <>
      <button onClick={toggle}
        className="text-xs px-2 py-1 rounded border border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer"
        style={{ transition: 'all var(--transition)' }}
        title="Help"
      >?</button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-crust/90 backdrop-blur-sm"
          style={{ animation: 'fadeIn 0.25s ease' }}
          onClick={toggle}>
          <div className="max-w-md w-full mx-4 rounded-2xl border border-surface0 bg-mantle p-5 text-txt"
            style={{ animation: 'scaleIn 0.25s ease' }}
            onClick={e => e.stopPropagation()}>

            {/* Step indicator */}
            <div className="flex gap-1.5 mb-4 justify-center">
              {STEPS.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full cursor-pointer ${i === step ? 'bg-blue' : 'bg-surface0'}`}
                  style={{ transition: 'background var(--transition)' }}
                  onClick={() => setStep(i)} />
              ))}
            </div>

            <h3 className="text-base font-bold text-blue mb-2">{s.title}</h3>

            {/* SVG illustration */}
            <div className="bg-base rounded-xl p-3 mb-3 border border-surface0">
              {s.svg}
            </div>

            <p className="text-xs text-subtext0 leading-relaxed mb-4">{s.desc}</p>

            {/* Navigation */}
            <div className="flex gap-2">
              {step > 0 && (
                <button onClick={() => setStep(step - 1)}
                  className="flex-1 py-2 rounded-lg bg-surface0 text-subtext1 font-semibold text-sm cursor-pointer hover:bg-surface1"
                  style={{ transition: 'all var(--transition)' }}
                >← Back</button>
              )}
              {step < STEPS.length - 1 ? (
                <button onClick={() => setStep(step + 1)}
                  className="flex-1 py-2 rounded-lg bg-blue text-crust font-semibold text-sm cursor-pointer hover:opacity-90"
                  style={{ transition: 'all var(--transition)' }}
                >Next →</button>
              ) : (
                <button onClick={toggle}
                  className="flex-1 py-2 rounded-lg bg-blue text-crust font-semibold text-sm cursor-pointer hover:opacity-90"
                  style={{ transition: 'all var(--transition)' }}
                >Got it ✓</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
