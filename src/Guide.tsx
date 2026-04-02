import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const step1svg = (
  <svg viewBox="0 0 320 80" className="w-full">
    <rect x={80} y={10} width={230} height={60} rx={3} fill="#1a1408" />
    <rect x={80} y={10} width={4} height={60} rx={1} fill="#e0d6c2" />
    <line x1={84} y1={28} x2={310} y2={28} stroke="#aaa" strokeWidth={1} />
    <line x1={84} y1={52} x2={310} y2={52} stroke="#aaa" strokeWidth={1.5} />
    <text x={76} y={32} textAnchor="end" fontSize={9} fill="#7f849c" fontFamily="monospace">
      A / Am
    </text>
    <text x={76} y={56} textAnchor="end" fontSize={9} fill="#7f849c" fontFamily="monospace">
      E / Em
    </text>
    <circle cx={120} cy={28} r={10} fill="#f38ba8" />
    <text x={120} y={31} textAnchor="middle" fontSize={8} fill="#fff" fontWeight="bold">
      1
    </text>
    <circle cx={180} cy={52} r={10} fill="#89b4fa" />
    <text x={180} y={55} textAnchor="middle" fontSize={8} fill="#fff" fontWeight="bold">
      5
    </text>
    <circle cx={240} cy={52} r={10} fill="transparent" stroke="#a6e3a1" strokeWidth={2} />
    <text x={240} y={55} textAnchor="middle" fontSize={8} fill="#a6e3a1">
      4
    </text>
  </svg>
);

const step2svg = (
  <svg viewBox="0 0 200 60" className="w-full">
    <circle cx={50} cy={30} r={14} fill="#89b4fa" />
    <text x={50} y={34} textAnchor="middle" fontSize={10} fill="#fff" fontWeight="bold">
      E
    </text>
    <rect x={116} y={16} width={28} height={28} rx={4} fill="#cba6f7" />
    <text x={130} y={34} textAnchor="middle" fontSize={10} fill="#fff" fontWeight="bold">
      A
    </text>
  </svg>
);

const step3svg = (
  <svg viewBox="0 0 360 100" className="w-full">
    <text x={50} y={10} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#cdd6f4">
      Open A
    </text>
    <rect x={20} y={16} width={60} height={60} rx={3} fill="#1a1408" />
    <rect x={20} y={16} width={60} height={3} rx={1} fill="#e0d6c2" />
    <line x1={20} y1={19} x2={80} y2={19} stroke="#2a3a5a" strokeWidth={0.8} />
    <line x1={20} y1={34} x2={80} y2={34} stroke="#2a3a5a" strokeWidth={0.8} />
    <line x1={20} y1={49} x2={80} y2={49} stroke="#2a3a5a" strokeWidth={0.8} />
    <line x1={20} y1={64} x2={80} y2={64} stroke="#2a3a5a" strokeWidth={0.8} />
    <line x1={20} y1={16} x2={20} y2={76} stroke="#666" strokeWidth={0.6} />
    <line x1={32} y1={16} x2={32} y2={76} stroke="#666" strokeWidth={0.6} />
    <line x1={44} y1={16} x2={44} y2={76} stroke="#666" strokeWidth={0.6} />
    <line x1={56} y1={16} x2={56} y2={76} stroke="#666" strokeWidth={0.6} />
    <line x1={68} y1={16} x2={68} y2={76} stroke="#666" strokeWidth={0.6} />
    <line x1={80} y1={16} x2={80} y2={76} stroke="#666" strokeWidth={0.6} />
    <text x={20} y={13} textAnchor="middle" fontSize={7} fill="#7f849c">
      ×
    </text>
    <circle cx={32} cy={13} r={3} fill="none" stroke="#7f849c" strokeWidth={1} />
    <circle cx={80} cy={13} r={3} fill="none" stroke="#7f849c" strokeWidth={1} />
    <circle cx={44} cy={27} r={4} fill="#f38ba8" />
    <circle cx={56} cy={27} r={4} fill="#f38ba8" />
    <circle cx={68} cy={27} r={4} fill="#f38ba8" />

    <text x={108} y={48} fontSize={16} fill="#89b4fa">
      →
    </text>
    <text x={108} y={62} textAnchor="middle" fontSize={7} fill="#7f849c">
      barre@3
    </text>

    <text x={180} y={10} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#cdd6f4">
      C (A@3)
    </text>
    <rect x={145} y={16} width={70} height={60} rx={3} fill="#1a1408" />
    <text x={143} y={30} textAnchor="end" fontSize={7} fill="#7f849c">
      3
    </text>
    <line x1={145} y1={19} x2={215} y2={19} stroke="#2a3a5a" strokeWidth={0.8} />
    <line x1={145} y1={34} x2={215} y2={34} stroke="#2a3a5a" strokeWidth={0.8} />
    <line x1={145} y1={49} x2={215} y2={49} stroke="#2a3a5a" strokeWidth={0.8} />
    <line x1={145} y1={64} x2={215} y2={64} stroke="#2a3a5a" strokeWidth={0.8} />
    <line x1={145} y1={16} x2={145} y2={76} stroke="#666" strokeWidth={0.6} />
    <line x1={159} y1={16} x2={159} y2={76} stroke="#666" strokeWidth={0.6} />
    <line x1={173} y1={16} x2={173} y2={76} stroke="#666" strokeWidth={0.6} />
    <line x1={187} y1={16} x2={187} y2={76} stroke="#666" strokeWidth={0.6} />
    <line x1={201} y1={16} x2={201} y2={76} stroke="#666" strokeWidth={0.6} />
    <line x1={215} y1={16} x2={215} y2={76} stroke="#666" strokeWidth={0.6} />
    <text x={145} y={13} textAnchor="middle" fontSize={7} fill="#7f849c">
      ×
    </text>
    <rect x={155} y={22} width={56} height={7} rx={3.5} fill="#f38ba8" opacity={0.8} />
    <circle cx={173} cy={42} r={4} fill="#f38ba8" />
    <circle cx={187} cy={42} r={4} fill="#f38ba8" />
    <circle cx={201} cy={42} r={4} fill="#f38ba8" />

    <text x={238} y={48} fontSize={16} fill="#89b4fa">
      =
    </text>

    <text x={300} y={10} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#cdd6f4">
      Shape Grid
    </text>
    <rect x={255} y={18} width={90} height={44} rx={3} fill="#1a1408" />
    <line x1={255} y1={32} x2={345} y2={32} stroke="#aaa" strokeWidth={1} />
    <line x1={255} y1={50} x2={345} y2={50} stroke="#aaa" strokeWidth={1.5} />
    <text x={252} y={36} textAnchor="end" fontSize={7} fill="#7f849c">
      A
    </text>
    <text x={252} y={54} textAnchor="end" fontSize={7} fill="#7f849c">
      E
    </text>
    <line x1={300} y1={18} x2={300} y2={62} stroke="#2a3a5a" strokeWidth={0.8} />
    <text x={300} y={75} textAnchor="middle" fontSize={7} fill="#7f849c">
      3
    </text>
    <circle cx={300} cy={32} r={8} fill="#f38ba8" />
    <text x={300} y={35} textAnchor="middle" fontSize={7} fill="#fff" fontWeight="bold">
      1
    </text>
    <text x={300} y={90} textAnchor="middle" fontSize={7} fill="#89b4fa">
      ↑ C here
    </text>
  </svg>
);

const step4svg = (
  <svg viewBox="0 0 280 60" className="w-full">
    <circle cx={50} cy={30} r={14} fill="#a6e3a1" />
    <text x={50} y={34} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="bold">
      4
    </text>
    <text x={50} y={55} textAnchor="middle" fontSize={8} fill="#7f849c">
      optimal
    </text>
    <text x={95} y={34} textAnchor="middle" fontSize={14} fill="#7f849c">
      →
    </text>
    <circle cx={140} cy={30} r={14} fill="transparent" stroke="#a6e3a1" strokeWidth={2} opacity={0.5} />
    <text x={140} y={34} textAnchor="middle" fontSize={9} fill="#a6e3a1" opacity={0.5}>
      4
    </text>
    <text x={140} y={55} textAnchor="middle" fontSize={8} fill="#7f849c">
      alternative
    </text>
    <circle cx={230} cy={30} r={14} fill="transparent" stroke="#f9e2af" strokeWidth={2} opacity={0.15} />
    <text x={230} y={34} textAnchor="middle" fontSize={9} fill="#f9e2af" opacity={0.15}>
      3
    </text>
    <text x={230} y={55} textAnchor="middle" fontSize={8} fill="#7f849c">
      dimmed
    </text>
  </svg>
);

const step5svg = (
  <svg viewBox="0 0 140 130" className="w-full max-w-[180px] mx-auto">
    <text x={70} y={12} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#cdd6f4">
      Am
    </text>
    <rect x={25} y={22} width={90} height={3} rx={1} fill="#e0d6c2" />
    <line x1={25} y1={25} x2={115} y2={25} stroke="#313244" strokeWidth={0.8} />
    <line x1={25} y1={47} x2={115} y2={47} stroke="#313244" strokeWidth={0.8} />
    <line x1={25} y1={69} x2={115} y2={69} stroke="#313244" strokeWidth={0.8} />
    <line x1={25} y1={91} x2={115} y2={91} stroke="#313244" strokeWidth={0.8} />
    <line x1={25} y1={113} x2={115} y2={113} stroke="#313244" strokeWidth={0.8} />
    <line x1={25} y1={18} x2={25} y2={113} stroke="#6c7086" strokeWidth={0.8} />
    <line x1={43} y1={18} x2={43} y2={113} stroke="#6c7086" strokeWidth={0.8} />
    <line x1={61} y1={18} x2={61} y2={113} stroke="#6c7086" strokeWidth={0.8} />
    <line x1={79} y1={18} x2={79} y2={113} stroke="#6c7086" strokeWidth={0.8} />
    <line x1={97} y1={18} x2={97} y2={113} stroke="#6c7086" strokeWidth={0.8} />
    <line x1={115} y1={18} x2={115} y2={113} stroke="#6c7086" strokeWidth={0.8} />
    <text x={25} y={18} textAnchor="middle" fontSize={10} fill="#7f849c">
      ×
    </text>
    <circle cx={43} cy={18} r={4} fill="none" stroke="#7f849c" strokeWidth={1.2} />
    <circle cx={115} cy={18} r={4} fill="none" stroke="#7f849c" strokeWidth={1.2} />
    <circle cx={61} cy={58} r={6} fill="#cba6f7" />
    <circle cx={79} cy={58} r={6} fill="#cba6f7" />
    <circle cx={97} cy={36} r={6} fill="#cba6f7" />
    <text x={70} y={125} textAnchor="middle" fontSize={8} fill="#7f849c">
      × = mute · ○ = open · ● = press
    </text>
  </svg>
);

const step6svg = (
  <svg viewBox="0 0 280 40" className="w-full">
    {['I', 'IIm', 'IIIm', 'IV', 'V', 'VIm'].map((label, i) => (
      <g key={label}>
        <circle cx={25 + i * 44} cy={16} r={12} fill={`var(--color-deg-${i + 1})`} />
        <text x={25 + i * 44} y={20} textAnchor="middle" fontSize={8} fill="#fff" fontWeight="bold">
          {label}
        </text>
      </g>
    ))}
  </svg>
);

const SVGS = [step1svg, step2svg, step3svg, step4svg, step5svg, step6svg];
const STEP_KEYS: [string, string][] = [
  ['guideT1', 'guideD1'],
  ['guideT2', 'guideD2'],
  ['guideT3', 'guideD3'],
  ['guideT4', 'guideD4'],
  ['guideT5', 'guideD5'],
  ['guideT6', 'guideD6'],
];

export function Guide() {
  const { t } = useTranslation();
  const buildId = __BUILD_ID__;
  const [open, setOpen] = useState(() => localStorage.getItem('chordao:guideSeen') !== buildId);
  const [step, setStep] = useState(0);
  const toggle = useCallback(() => {
    setOpen((v) => {
      if (v) localStorage.setItem('chordao:guideSeen', buildId);
      return !v;
    });
    setStep(0);
  }, [buildId]);
  const s = STEP_KEYS[step];

  return (
    <>
      <button
        onClick={toggle}
        className="text-[11px] py-1.5 md:py-1.5 px-2 rounded border border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer text-center w-7 h-7 md:w-auto md:h-auto flex items-center justify-center"
        style={{ transition: 'all var(--transition)' }}
        title="Help"
      >
        ?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-crust/90 backdrop-blur-sm"
          style={{ animation: 'fadeIn 0.25s ease' }}
          onClick={toggle}
        >
          <div
            className="max-w-md w-full mx-4 rounded-2xl border border-surface0 bg-mantle p-5 text-txt"
            style={{ animation: 'scaleIn 0.25s ease' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-1.5 mb-4 justify-center">
              {SVGS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full cursor-pointer ${i === step ? 'bg-blue' : 'bg-surface0'}`}
                  style={{ transition: 'background var(--transition)' }}
                  onClick={() => setStep(i)}
                />
              ))}
            </div>
            <h3 className="text-base font-bold text-blue mb-2">{t(s[0])}</h3>
            <div className="bg-base rounded-xl p-3 mb-3 border border-surface0">{SVGS[step]}</div>
            <p className="text-xs text-subtext0 leading-relaxed mb-4">{t(s[1])}</p>
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex-1 py-2 rounded-lg bg-surface0 text-subtext1 font-semibold text-sm cursor-pointer hover:bg-surface1"
                  style={{ transition: 'all var(--transition)' }}
                >
                  {t('back')}
                </button>
              )}
              {step < SVGS.length - 1 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="flex-1 py-2 rounded-lg bg-blue text-crust font-semibold text-sm cursor-pointer hover:opacity-90"
                  style={{ transition: 'all var(--transition)' }}
                >
                  {t('next')}
                </button>
              ) : (
                <button
                  onClick={toggle}
                  className="flex-1 py-2 rounded-lg bg-blue text-crust font-semibold text-sm cursor-pointer hover:opacity-90"
                  style={{ transition: 'all var(--transition)' }}
                >
                  {t('gotIt')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
