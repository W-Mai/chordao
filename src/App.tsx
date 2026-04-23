import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { playChord, scheduleBar, resetAudio, audioNow, RHYTHM_PATTERNS, type RhythmPattern } from './utils/audio';
import {
  NOTES,
  NOTE_DISPLAY,
  CIRCLE_OF_FIFTHS,
  generateVoicings,
  type ShapeSet,
  type ShapeSystem,
  groupByDegree,
  findAllCombinations,
  getFretboardIntervals,
  type ChordVoicing,
  type BassPrefer,
  voicingKey,
  type NoteName,
  PROGRESSIONS,
} from './data/chordData';
import { ChordDiagram } from './components/ChordDiagram';
import { FullscreenOverlay } from './components/FullscreenOverlay';
import { GridPanel } from './components/GridPanel';
import { FretPanel } from './components/FretPanel';
import { parseHash, useHashSync } from './hooks/useHashState';

import { Roller } from './components/Roller';

import { Guide } from './components/Guide';
import { Game } from './components/Game';
import { useExportImage } from './components/ExportView';

const DEGREE_LABELS = ['', 'I', 'IIm', 'IIIm', 'IV', 'V', 'VIm'];
const THEMES = ['dark', 'light', 'cyber'] as const;
const THEME_ICONS: Record<string, string> = { dark: '🌙', light: '☀️', cyber: '⚡' };

function App() {
  const { t, i18n } = useTranslation();

  // Parse URL hash for shared state: #key=C&prog=progPopCanon
  const initial = parseHash();
  const [selectedKey, _setSelectedKey] = useState<NoteName>(initial.key || 'C');

  const [hoveredChord, setHoveredChord] = useState<string | null>(null);
  const [lockedChord, setLockedChord] = useState<string | null>(null);
  const activeChordKey = lockedChord ?? hoveredChord;
  const handleHoverChord = useCallback((key: string | null) => setHoveredChord(key), []);
  const resetHover = useCallback(() => {
    setHoveredChord(null);
    setLockedChord(null);
  }, []);

  const setSelectedKey = useCallback(
    (k: NoteName) => {
      _setSelectedKey(k);
      resetHover();
    },
    [resetHover],
  );

  const systemTheme = () => (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  const [theme, setTheme] = useState<string>(() => {
    const saved = localStorage.getItem('chordao:theme');
    if (saved && THEMES.includes(saved as (typeof THEMES)[number])) return saved;
    return systemTheme();
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Follow system theme when in auto mode
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      if (!localStorage.getItem('chordao:theme')) {
        setTheme(mq.matches ? 'light' : 'dark');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme((t) => {
      const next = THEMES[(THEMES.indexOf(t as (typeof THEMES)[number]) + 1) % THEMES.length];
      // If next theme matches system preference, enter auto mode
      if (next === systemTheme()) {
        localStorage.removeItem('chordao:theme');
      } else {
        localStorage.setItem('chordao:theme', next);
      }
      return next;
    });
  }, []);

  const light = theme === 'light';

  const [showBarre, setShowBarre] = useState(() => localStorage.getItem('chordao:showBarre') !== 'false');
  const [shapeSet, setShapeSet] = useState<ShapeSet>(
    () => (localStorage.getItem('chordao:shapeSet') as ShapeSet) || 'triad',
  );
  const toggleShapeSet = useCallback(() => {
    setShapeSet((v) => {
      const next = v === 'triad' ? 'seventh' : 'triad';
      localStorage.setItem('chordao:shapeSet', next);
      return next;
    });
    resetHover();
  }, [resetHover]);
  const [shapeSystem, setShapeSystem] = useState<ShapeSystem>(
    () => (localStorage.getItem('chordao:shapeSystem') as ShapeSystem) || 'ea',
  );
  const toggleShapeSystem = useCallback(() => {
    setShapeSystem((v) => {
      const next = v === 'ea' ? 'caged' : 'ea';
      localStorage.setItem('chordao:shapeSystem', next);
      return next;
    });
    resetHover();
  }, [resetHover]);
  const [positionPrefer, setPositionPrefer] = useState<BassPrefer>(
    () => initial.prefer ?? ((localStorage.getItem('chordao:prefer') as BassPrefer) || 'none'),
  );
  const togglePrefer = useCallback(() => {
    setPositionPrefer((v) => {
      const order: BassPrefer[] = ['none', 'ascending', 'descending'];
      const next = order[(order.indexOf(v) + 1) % order.length];
      localStorage.setItem('chordao:prefer', next);
      return next;
    });
    resetHover();
  }, [resetHover]);
  const toggleBarre = useCallback(() => {
    setShowBarre((v) => {
      localStorage.setItem('chordao:showBarre', String(!v));
      return !v;
    });
  }, []);

  const [keyOrder, setKeyOrder] = useState<'fifths' | 'chromatic'>(
    () => (localStorage.getItem('chordao:keyOrder') as 'fifths' | 'chromatic') || 'fifths',
  );
  const toggleKeyOrder = useCallback(() => {
    setKeyOrder((v) => {
      const next = v === 'fifths' ? 'chromatic' : 'fifths';
      localStorage.setItem('chordao:keyOrder', next);
      return next;
    });
  }, []);
  const keyList = keyOrder === 'fifths' ? CIRCLE_OF_FIFTHS : NOTES;

  const voicings = useMemo(
    () => generateVoicings(selectedKey, 17, shapeSet, shapeSystem),
    [selectedKey, shapeSet, shapeSystem],
  );
  const grouped = useMemo(() => groupByDegree(voicings), [voicings]);

  const [activeDegree, setActiveDegree] = useState<number | null>(null);
  const toggleDegree = useCallback(
    (d: number) => {
      setActiveDegree((v) => (v === d ? null : d));
      resetHover();
    },
    [resetHover],
  );

  const [activeProg, setActiveProg] = useState<string | null>(initial.prog);
  const [customDegrees, setCustomDegrees] = useState<number[]>(initial.degrees);
  const [customInput, setCustomInput] = useState(initial.degrees.length ? initial.degrees.join(' ') : '');
  const toggleProg = useCallback(
    (name: string) => {
      setActiveProg((v) => (v === name ? null : name));
      setActiveDegree(null);
      resetHover();
    },
    [resetHover],
  );

  const handleCustomProg = useCallback(
    (input: string) => {
      const degrees = input
        .split(/[\s,-]+/)
        .map(Number)
        .filter((n) => n >= 1 && n <= 6);
      setCustomInput(input);
      if (degrees.length >= 2) {
        setCustomDegrees(degrees);
        setActiveProg('custom');
        setActiveDegree(null);
        resetHover();
      }
    },
    [resetHover],
  );

  const [muted, setMuted] = useState(() => localStorage.getItem('chordao:muted') === 'true');
  const toggleMute = useCallback(() => {
    setMuted((v) => {
      localStorage.setItem('chordao:muted', String(!v));
      return !v;
    });
  }, []);

  const activeProgObj = useMemo(() => {
    if (activeProg === 'custom' && customDegrees.length >= 2) return { name: 'custom', degrees: customDegrees };
    return activeProg ? (PROGRESSIONS.find((p) => p.name === activeProg) ?? null) : null;
  }, [activeProg, customDegrees]);
  const allCombos = useMemo(
    () => findAllCombinations(grouped, activeProgObj?.degrees, positionPrefer),
    [grouped, activeProgObj, positionPrefer],
  );
  const [comboIdx, setComboIdx] = useState(initial.combo ?? 0);
  // Reset combo index when combos change (but only if current index becomes invalid)
  useEffect(() => {
    setComboIdx((prev) => (prev === -1 || (prev >= 0 && prev < allCombos.length) ? prev : 0));
  }, [allCombos]);
  const optimal = useMemo(() => {
    if (comboIdx === -1) {
      // All: merge all combos, deduplicate by voicingKey
      const seen = new Set<string>();
      const merged: ChordVoicing[] = [];
      for (const combo of allCombos) {
        for (const v of combo) {
          const k = voicingKey(v);
          if (!seen.has(k)) {
            seen.add(k);
            merged.push(v);
          }
        }
      }
      return merged;
    }
    return allCombos[comboIdx] ?? allCombos[0] ?? [];
  }, [allCombos, comboIdx]);
  const optimalSet = useMemo(() => new Set(optimal.map(voicingKey)), [optimal]);

  // Auto-play progression
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(() => Number(localStorage.getItem('chordao:bpm')) || 100);
  const [rhythm, setRhythm] = useState<RhythmPattern>(() => {
    const saved = localStorage.getItem('chordao:rhythm');
    return RHYTHM_PATTERNS.find((r) => r.name === saved) ?? RHYTHM_PATTERNS[0];
  });
  const [playStep, setPlayStep] = useState(0);
  const [beat, setBeat] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPlay = useCallback(() => {
    setPlaying(false);
    if (playRef.current) clearInterval(playRef.current);
    playRef.current = null;
    setBeat(false);
    setLockedChord(null);
  }, []);

  const startPlay = useCallback(() => {
    if (!activeProgObj || activeProgObj.degrees.length < 2) return;
    if (comboIdx === -1) setComboIdx(0);
    setPlaying(true);
    setPlayStep(0);
  }, [activeProgObj, comboIdx]);

  const togglePlay = useCallback(() => {
    if (playing) stopPlay();
    else startPlay();
  }, [playing, stopPlay, startPlay]);

  // Play loop — use absolute audio time to prevent overlap
  const nextBarTimeRef = useRef(0);
  useEffect(() => {
    if (!playing || !activeProgObj) return;
    const barDur = (60 / bpm) * 4; // 4 beats per bar in seconds
    const degrees = activeProgObj.degrees;

    const scheduleStep = (step: number, time: number) => {
      const deg = degrees[step % degrees.length];
      const v = optimal.find((o) => o.degree === deg);
      if (v) {
        setLockedChord(voicingKey(v));
        if (!muted) scheduleBar(v.frets, bpm, rhythm, time);
      }
      setBeat(true);
      setTimeout(() => setBeat(false), 120);
      setPlayStep(step % degrees.length);
    };

    // Schedule first bar at current audio time
    const startTime = audioNow();
    nextBarTimeRef.current = startTime + barDur;
    scheduleStep(0, startTime);

    // Use setInterval to advance steps, but schedule at absolute times
    let step = 0;
    playRef.current = setInterval(() => {
      step++;
      scheduleStep(step, nextBarTimeRef.current);
      nextBarTimeRef.current += barDur;
    }, barDur * 1000);

    return () => {
      if (playRef.current) clearInterval(playRef.current);
      resetAudio();
    };
  }, [playing, bpm, activeProgObj, optimal, muted, rhythm]);

  // Stop when progression changes
  useEffect(() => {
    stopPlay();
  }, [activeProg, stopPlay]);

  const handleBpmChange = useCallback((v: number) => {
    setBpm(v);
    localStorage.setItem('chordao:bpm', String(v));
  }, []);

  const activeProgDegrees = useMemo(() => {
    if (!activeProgObj) return null;
    return new Set(activeProgObj.degrees);
  }, [activeProgObj]);

  const filteredVoicings = useMemo(() => {
    if (activeDegree) return voicings.filter((v) => v.degree === activeDegree);
    if (activeProgDegrees) return voicings.filter((v) => activeProgDegrees.has(v.degree));
    return voicings;
  }, [voicings, activeDegree, activeProgDegrees]);
  const filteredOptimal = useMemo(() => {
    if (activeDegree) return optimal.filter((v) => v.degree === activeDegree);
    if (activeProgDegrees) return optimal.filter((v) => activeProgDegrees.has(v.degree));
    return optimal;
  }, [optimal, activeDegree, activeProgDegrees]);

  const handleClickChord = useCallback(
    (key: string) => {
      if (!muted) {
        const v = voicings.find((v) => voicingKey(v) === key);
        if (v) playChord(v.frets);
      }
    },
    [voicings, muted],
  );

  const handleDblClickChord = useCallback((key: string) => {
    setLockedChord((prev) => (prev === key ? null : key));
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [intervalMode, setIntervalMode] = useState(initial.intervalMode);
  const [visibleIntervals, setVisibleIntervals] = useState(
    () =>
      new Set(
        initial.visibleIntervals ??
          (JSON.parse(localStorage.getItem('chordao:intervals') || '["R","3","b3","5","b7","7"]') as string[]),
      ),
  );
  const toggleInterval = useCallback((iv: string) => {
    setVisibleIntervals((s) => {
      const n = new Set(s);
      if (n.has(iv)) n.delete(iv);
      else n.add(iv);
      localStorage.setItem('chordao:intervals', JSON.stringify([...n]));
      return n;
    });
  }, []);
  const intervalMap = useMemo(() => getFretboardIntervals(selectedKey), [selectedKey]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const openShare = useCallback(() => {
    setShareOpen(true);
    requestAnimationFrame(() => setShareVisible(true));
  }, []);
  const closeShare = useCallback(() => {
    setShareVisible(false);
    setTimeout(() => setShareOpen(false), 150);
  }, []);

  const [fullscreen, setFullscreen] = useState<'grid' | 'fret' | null>(initial.fullscreen);
  const openGrid = useCallback(() => setFullscreen('grid'), []);
  const openFret = useCallback(() => setFullscreen('fret'), []);
  const closeFullscreen = useCallback(() => setFullscreen(null), []);
  const gridFS = fullscreen === 'grid';
  const fretFS = fullscreen === 'fret';

  // Sync state to URL hash for sharing
  useHashSync({
    key: selectedKey,
    activeProg,
    customDegrees,
    comboIdx,
    positionPrefer,
    intervalMode,
    visibleIntervals,
    fullscreen,
  });

  // Swipe on header to switch key
  const headerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) < 80) return;
      const idx = keyList.indexOf(selectedKey);
      // Swipe left = next, swipe right = prev
      setSelectedKey(keyList[(idx + (dx < 0 ? 1 : -1) + 12) % 12]);
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    };
  }, [keyList, selectedKey, setSelectedKey]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = keyList.indexOf(selectedKey);
      if (e.key === 'ArrowLeft') setSelectedKey(keyList[(idx - 1 + 12) % 12]);
      else if (e.key === 'ArrowRight') setSelectedKey(keyList[(idx + 1) % 12]);
      else if (e.key >= '1' && e.key <= '6') toggleDegree(Number(e.key));
      else if (e.key === '0' || e.key === 'Escape') setActiveDegree(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [keyList, selectedKey, setSelectedKey, toggleDegree]);

  const { exportImage, ExportContainer, PreviewModal } = useExportImage({
    selectedKey,
    voicings,
    optimal,
    optimalSet,
    grouped,
    showBarre,
    activeProgObj,
    filteredVoicings,
    filteredOptimal,
    shapeSystem,
  });

  return (
    <div className="flex flex-col h-screen">
      {/* Unified header bar */}
      <header
        className="w-full shrink-0 border-b border-surface0 bg-mantle px-3 py-2"
        style={{ transition: 'background var(--transition), border-color var(--transition)' }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="w-7 h-7 rounded-lg bg-blue/15 flex items-center justify-center shrink-0"
            style={{ boxShadow: theme === 'cyber' ? '0 0 10px var(--blue)' : 'none' }}
          >
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="w-4 h-4" />
          </div>
          <h1
            className="text-sm font-bold tracking-wide text-txt mr-auto flex items-center gap-1.5"
            style={{ textShadow: theme === 'cyber' ? '0 0 8px var(--blue)' : 'none' }}
          >
            {t('appName')}
            <span key={selectedKey} className="text-blue text-xs font-mono" style={{ animation: 'slideIn 0.2s ease' }}>
              {NOTE_DISPLAY[selectedKey]}
            </span>
          </h1>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={toggleMute}
              className={`text-[10px] w-7 h-7 rounded border cursor-pointer flex items-center justify-center ${muted ? 'border-red text-red' : 'border-surface0 text-overlay1'}`}
              style={{ transition: 'all var(--transition)' }}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <button
              onClick={cycleTheme}
              className="text-[10px] w-7 h-7 rounded border border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer flex items-center justify-center"
              style={{ transition: 'all var(--transition)' }}
            >
              {THEME_ICONS[theme]}
            </button>
            <Guide />
            <Game />
            <div className="relative">
              <button
                onClick={() => (shareOpen ? closeShare() : openShare())}
                className="text-[10px] w-7 h-7 rounded border border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer flex items-center justify-center"
                style={{ transition: 'all var(--transition)' }}
              >
                {'↗'}
              </button>
              {shareOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={closeShare} />
                  <div
                    className="absolute right-0 top-9 bg-mantle border border-surface0 rounded-xl shadow-xl p-3 flex flex-col gap-2 z-50 min-w-48"
                    style={{
                      opacity: shareVisible ? 1 : 0,
                      transform: shareVisible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.95)',
                      transition: 'opacity 0.15s ease, transform 0.15s ease',
                    }}
                  >
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        setShareOpen(false);
                      }}
                      className="text-[11px] px-3 py-1.5 rounded-lg bg-surface0 text-txt hover:bg-surface1 cursor-pointer text-left"
                      style={{ transition: 'all var(--transition)' }}
                    >
                      {'🔗 '}
                      {t('copyLink')}
                    </button>
                    <button
                      onClick={() => {
                        exportImage();
                        setShareOpen(false);
                      }}
                      className="text-[11px] px-3 py-1.5 rounded-lg bg-surface0 text-txt hover:bg-surface1 cursor-pointer text-left"
                      style={{ transition: 'all var(--transition)' }}
                    >
                      {'📷 '}
                      {t('export')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Floating sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-crust/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        )}
        <aside
          onClick={sidebarOpen ? undefined : () => setSidebarOpen(true)}
          className={`fixed z-50 bottom-16 left-4 bg-mantle/95 backdrop-blur-xl shadow-2xl border border-surface0 overflow-hidden ${
            sidebarOpen ? 'cursor-default' : 'cursor-pointer'
          }`}
          style={{
            borderRadius: sidebarOpen ? 44 : 24,
            width: sidebarOpen ? 'min(85vw, 320px)' : 48,
            height: sidebarOpen ? 'min(80vh, 600px)' : 48,
            transition:
              'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), height 0.35s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.35s ease',
            willChange: 'width, height',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}
        >
          {/* Logo visible when collapsed */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              opacity: sidebarOpen ? 0 : 1,
              transition: 'opacity 0.15s ease',
              pointerEvents: sidebarOpen ? 'none' : 'auto',
            }}
          >
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="w-6 h-6" />
          </div>
          {/* Panel content visible when expanded */}
          <div
            className="flex flex-col gap-3 p-5 overflow-y-auto h-full"
            style={{
              opacity: sidebarOpen ? 1 : 0,
              transition: 'opacity 0.2s ease 0.15s',
              pointerEvents: sidebarOpen ? 'auto' : 'none',
            }}
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="self-end w-8 h-8 rounded-full bg-surface0 text-overlay1 hover:text-txt flex items-center justify-center cursor-pointer shrink-0 mb-1"
              style={{ transition: 'all var(--transition)' }}
            >
              {'✕'}
            </button>
            {/* Settings row */}
            <div className="flex gap-1.5 flex-wrap mb-1">
              <button
                onClick={toggleBarre}
                className={`text-[11px] px-2.5 py-1 rounded-lg cursor-pointer ${showBarre ? 'bg-blue/20 text-blue font-semibold' : 'text-overlay0 hover:text-subtext0'}`}
                style={{ transition: 'all var(--transition)' }}
              >
                {t('barre')}
              </button>
              <button
                onClick={toggleShapeSet}
                className={`text-[11px] px-2.5 py-1 rounded-lg cursor-pointer ${shapeSet === 'seventh' ? 'bg-blue/20 text-blue font-semibold' : 'text-overlay0 hover:text-subtext0'}`}
                style={{ transition: 'all var(--transition)' }}
              >
                {shapeSet === 'seventh' ? t('shapeSeventh') : t('shapeTriad')}
              </button>
              <button
                onClick={toggleShapeSystem}
                className={`text-[11px] px-2.5 py-1 rounded-lg cursor-pointer ${shapeSystem === 'caged' ? 'bg-blue/20 text-blue font-semibold' : 'text-overlay0 hover:text-subtext0'}`}
                style={{ transition: 'all var(--transition)' }}
              >
                {shapeSystem === 'caged' ? 'CAGED' : 'E/A'}
              </button>
              <button
                onClick={toggleKeyOrder}
                className={`text-[11px] px-2.5 py-1 rounded-lg cursor-pointer ${keyOrder === 'fifths' ? 'bg-blue/20 text-blue font-semibold' : 'text-overlay0 hover:text-subtext0'}`}
                style={{ transition: 'all var(--transition)' }}
              >
                {keyOrder === 'fifths' ? '⑤ 5ths' : '♪ Semi'}
              </button>
              <button
                onClick={() => {
                  const next = i18n.language === 'en' ? 'zh' : 'en';
                  i18n.changeLanguage(next);
                  localStorage.setItem('chordao:lang', next);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg cursor-pointer text-overlay0 hover:text-subtext0"
                style={{ transition: 'all var(--transition)' }}
              >
                {i18n.language === 'en' ? '中文' : 'En'}
              </button>
            </div>
            <div ref={headerRef} className="grid grid-cols-6 md:grid-cols-4 gap-1">
              {keyList.map((note) => (
                <button
                  key={note}
                  onClick={() => setSelectedKey(note)}
                  className={`px-1 py-1.5 rounded text-xs cursor-pointer ${
                    selectedKey === note
                      ? 'bg-blue text-crust font-bold'
                      : 'border border-surface0 text-overlay1 hover:border-blue'
                  }`}
                  style={{
                    transition: 'all var(--transition)',
                    boxShadow: selectedKey === note ? '0 0 8px var(--blue)' : 'none',
                  }}
                >
                  {NOTE_DISPLAY[note]}
                </button>
              ))}
            </div>

            {/* Degree filter */}
            <div className="grid grid-cols-6 md:grid-cols-3 gap-1.5">
              {DEGREE_LABELS.slice(1).map((label, i) => {
                const deg = i + 1;
                const isActive = activeDegree === deg;
                const dimmed = activeDegree !== null && !isActive;
                return (
                  <button
                    key={label}
                    onClick={() => toggleDegree(deg)}
                    className={`px-2 py-1 rounded-full text-xs font-bold text-white cursor-pointer ${dimmed ? 'opacity-20' : ''}`}
                    style={{
                      background: `var(--color-deg-${deg})`,
                      transition: 'all var(--transition)',
                      boxShadow: isActive ? `0 0 12px var(--color-deg-${deg})` : 'none',
                      transform: isActive ? 'scale(1.08)' : 'scale(1)',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Progressions */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-overlay0 uppercase tracking-wider hidden md:block">
                {t('progressions')}
              </span>
              {/* Desktop: vertical list */}
              <div className="hidden md:flex md:flex-col gap-1 max-h-40 overflow-y-auto">
                {PROGRESSIONS.map((p) => {
                  const isActive = activeProg === p.name;
                  return (
                    <button
                      key={p.name}
                      onClick={() => toggleProg(p.name)}
                      className={`text-left text-[11px] px-2 py-1 rounded cursor-pointer whitespace-nowrap ${
                        isActive ? 'bg-blue/15 text-blue' : 'text-subtext0 hover:text-txt hover:bg-surface0/30'
                      }`}
                      style={{ transition: 'all var(--transition)' }}
                    >
                      {t(p.name)} <span className="text-overlay0">{p.degrees.join('-')}</span>
                    </button>
                  );
                })}
              </div>
              {/* Mobile: vertical roller + custom input */}
              <div className="md:hidden">
                <Roller
                  items={[{ name: '', degrees: [] as number[] }, ...PROGRESSIONS]}
                  activeKey={activeProg ?? ''}
                  getKey={(p) => p.name}
                  getLabel={(p) => (p.name ? `${t(p.name)} ${p.degrees.join('-')}` : t('none'))}
                  onSelect={(name) => {
                    if (activeProg !== 'custom') setActiveProg(name || null);
                  }}
                />
                <span className="text-[10px] text-overlay0 mb-0.5">{t('customProg')}</span>
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder={t('customProgHint')}
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="flex-1 text-[11px] px-2 py-1 rounded border border-surface0 bg-base text-txt placeholder-overlay0 outline-none focus:border-blue min-w-0"
                    style={{ transition: 'border-color var(--transition)' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCustomProg(e.currentTarget.value);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCustomProg(customInput)}
                    className="text-[10px] px-3 py-1 rounded border border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer shrink-0 active:bg-surface0"
                    style={{ transition: 'all var(--transition)' }}
                  >
                    {'→'}
                  </button>
                </div>
              </div>
              {/* Desktop: custom progression input */}
              <div className="hidden md:block mt-1">
                <span className="text-[10px] text-overlay0 uppercase tracking-wider hidden md:block mb-1">
                  {t('customProg')}
                </span>
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="1 4 5 1"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="flex-1 text-[11px] px-2 py-1 rounded border border-surface0 bg-base text-txt placeholder-overlay0 outline-none focus:border-blue min-w-0"
                    style={{ transition: 'border-color var(--transition)' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCustomProg(e.currentTarget.value);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCustomProg(customInput)}
                    className="text-[10px] px-3 py-1 rounded border border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer shrink-0 active:bg-surface0"
                    style={{ transition: 'all var(--transition)' }}
                  >
                    {'→'}
                  </button>
                </div>
                <p className="text-[9px] text-overlay0 mt-0.5 hidden md:block">{t('customProgHint')}</p>
              </div>
            </div>

            {/* Play controls */}
            {activeProgObj && (
              <>
                <div className="flex items-center gap-2 px-1">
                  <button
                    onClick={togglePlay}
                    className={`text-[14px] w-8 h-8 rounded-lg border cursor-pointer flex items-center justify-center shrink-0 ${playing ? 'border-green text-green bg-green/10' : 'border-surface0 text-overlay1'}`}
                    style={{ transition: 'all var(--transition)', transform: beat ? 'scale(1.1)' : 'scale(1)' }}
                  >
                    {playing ? '⏸' : '▶'}
                  </button>
                  <input
                    type="range"
                    min={60}
                    max={180}
                    value={bpm}
                    onChange={(e) => handleBpmChange(Number(e.target.value))}
                    className="flex-1 h-1 accent-blue min-w-0"
                  />
                  <input
                    type="number"
                    min={60}
                    max={180}
                    value={bpm}
                    onChange={(e) => handleBpmChange(Number(e.target.value) || 0)}
                    onBlur={() => handleBpmChange(Math.min(180, Math.max(60, bpm || 100)))}
                    className="w-12 text-[11px] text-center px-1 py-0.5 rounded border border-surface0 bg-base text-txt outline-none focus:border-blue"
                    style={{ transition: 'border-color var(--transition)' }}
                  />
                  <span className="text-[9px] text-overlay0 shrink-0">BPM</span>
                </div>
                <div className="flex gap-1 flex-wrap mt-1.5">
                  {RHYTHM_PATTERNS.map((r) => (
                    <button
                      key={r.name}
                      onClick={() => {
                        setRhythm(r);
                        localStorage.setItem('chordao:rhythm', r.name);
                      }}
                      className={`text-[10px] px-1.5 py-0.5 rounded border cursor-pointer ${rhythm.name === r.name ? 'border-blue text-blue bg-blue/10' : 'border-surface0 text-overlay0'}`}
                      style={{ transition: 'all var(--transition)' }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Main */}
        <main
          className="flex-1 min-h-0 p-2 md:p-6 overflow-y-auto bg-crust w-full"
          style={{ transition: 'background var(--transition)' }}
        >
          <GridPanel
            filteredVoicings={filteredVoicings}
            filteredOptimal={filteredOptimal}
            allCombos={allCombos}
            comboIdx={comboIdx}
            setComboIdx={setComboIdx}
            positionPrefer={positionPrefer}
            togglePrefer={togglePrefer}
            light={light}
            activeChordKey={activeChordKey}
            handleHoverChord={handleHoverChord}
            handleClickChord={handleClickChord}
            handleDblClickChord={handleDblClickChord}
            progressionDegrees={activeProgObj?.degrees}
            animationDuration={playing && activeProgObj ? (activeProgObj.degrees.length * 60 * 4) / bpm : undefined}
            activeStep={playing ? playStep : undefined}
            onExpand={openGrid}
          />

          <FretPanel
            filteredVoicings={filteredVoicings}
            filteredOptimal={filteredOptimal}
            light={light}
            activeChordKey={activeChordKey}
            handleHoverChord={handleHoverChord}
            handleClickChord={handleClickChord}
            handleDblClickChord={handleDblClickChord}
            intervalMode={intervalMode}
            setIntervalMode={setIntervalMode}
            visibleIntervals={visibleIntervals}
            toggleInterval={toggleInterval}
            intervalMap={intervalMap}
            onExpand={openFret}
          />

          <section className="panel mb-2 md:mb-6">
            <div className="panel-header">
              <span className="panel-title">{t('chordDiagrams')}</span>
              <span className="text-[10px] text-overlay0 ml-2">{t('dblClickExpand')}</span>
            </div>
            <div className="panel-body">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:flex md:flex-wrap gap-2 md:gap-4 justify-items-center">
                {[1, 2, 3, 4, 5, 6].map((degree) => {
                  const dv = grouped.get(degree) ?? [];
                  return dv.map((v) => (
                    <ChordDiagram
                      key={voicingKey(v)}
                      voicing={v}
                      highlighted={
                        activeChordKey == null ? optimalSet.has(voicingKey(v)) : activeChordKey === voicingKey(v)
                      }
                      dimmed={activeChordKey != null && activeChordKey !== voicingKey(v)}
                      light={light}
                      showBarre={showBarre}
                      onDoubleClick={() => handleDblClickChord(voicingKey(v))}
                      onPointerEnter={() => handleHoverChord(voicingKey(v))}
                      onPointerLeave={() => handleHoverChord(null)}
                      onClick={() => handleClickChord(voicingKey(v))}
                    />
                  ));
                })}
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="shrink-0 bg-mantle" style={{ transition: 'background var(--transition)' }}>
        <div className="h-px bg-gradient-to-r from-transparent via-blue/30 to-transparent" />
        <div className="py-2.5 flex items-center justify-center gap-2 text-[11px] text-overlay1 flex-wrap">
          <span>{t('appName')}</span>
          <span className="text-surface1">·</span>
          <span>{t('derivation')}</span>
          <span className="text-surface1">·</span>
          <a
            href="https://github.com/W-Mai/chordao"
            target="_blank"
            rel="noopener"
            className="text-blue hover:underline"
          >
            {t('github')}
          </a>
          <span className="text-surface1">·</span>
          <span>{t('mit')}</span>
        </div>
      </footer>

      {/* Fullscreen overlays — same panels, minus the expand button */}
      <FullscreenOverlay active={gridFS} onClose={closeFullscreen}>
        <GridPanel
          filteredVoicings={filteredVoicings}
          filteredOptimal={filteredOptimal}
          allCombos={allCombos}
          comboIdx={comboIdx}
          setComboIdx={setComboIdx}
          positionPrefer={positionPrefer}
          togglePrefer={togglePrefer}
          light={light}
          activeChordKey={activeChordKey}
          handleHoverChord={handleHoverChord}
          handleClickChord={handleClickChord}
          handleDblClickChord={handleDblClickChord}
          progressionDegrees={activeProgObj?.degrees}
          animationDuration={playing && activeProgObj ? (activeProgObj.degrees.length * 60 * 4) / bpm : undefined}
          activeStep={playing ? playStep : undefined}
        />
      </FullscreenOverlay>
      <FullscreenOverlay active={fretFS} onClose={closeFullscreen}>
        <FretPanel
          filteredVoicings={filteredVoicings}
          filteredOptimal={filteredOptimal}
          light={light}
          activeChordKey={activeChordKey}
          handleHoverChord={handleHoverChord}
          handleClickChord={handleClickChord}
          handleDblClickChord={handleDblClickChord}
          intervalMode={intervalMode}
          setIntervalMode={setIntervalMode}
          visibleIntervals={visibleIntervals}
          toggleInterval={toggleInterval}
          intervalMap={intervalMap}
        />
      </FullscreenOverlay>

      {ExportContainer}
      {PreviewModal}
    </div>
  );
}

export default App;
