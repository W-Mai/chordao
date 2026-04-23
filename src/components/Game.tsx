import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  NOTES,
  NOTE_DISPLAY,
  generateVoicings,
  groupByDegree,
  findOptimalCombination,
  voicingKey,
  type ChordVoicing,
} from '../data/chordData';
import { ShapeGrid } from './ShapeGrid';
import { Fretboard } from './Fretboard';
import {
  DEGREE_LABELS,
  DIFFICULTY_TIME,
  TOTAL_QUESTIONS,
  STRING_NAMES,
  generateIntervalQuestion,
  generateQuestion,
  type GameMode,
  type Difficulty,
  type IntervalQuestion,
  type Question,
} from './game/gameLogic';
import { getBest, saveBest } from './game/gameStorage';
import { useGameTimer } from './game/useGameTimer';
import { useSprintState } from './game/useSprintState';
import { useChainState } from './game/useChainState';

export function Game() {
  const { t } = useTranslation();
  const [, setOpen] = useState(false);
  const [mode, setMode] = useState<GameMode>('locate');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [question, setQuestion] = useState<Question | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rotated, setRotated] = useState(false);
  const [correctHighlight, setCorrectHighlight] = useState<string[]>([]);
  const [memoryPhase, setMemoryPhase] = useState<'show' | 'guess'>('show');
  const [intervalQ, setIntervalQ] = useState<IntervalQuestion | null>(null);

  const { questionTimer, setQuestionTimer, startTimer, stopTimer, safeTimeout, clearPendingTimeouts } = useGameTimer();
  const sprint = useSprintState();
  const chain = useChainState();
  const { sprintFound, sprintElapsed } = sprint;
  const { chainStep, chainTarget } = chain;

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';

  useEffect(() => {
    if (!mounted) return;
    const update = () => setRotated(window.innerHeight > window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [mounted]);

  const openGame = useCallback(() => {
    setOpen(true);
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  const closeGame = useCallback(() => {
    setVisible(false);
    stopTimer();
    clearPendingTimeouts();
    setTimeout(() => {
      setMounted(false);
      setOpen(false);
    }, 250);
  }, [stopTimer, clearPendingTimeouts]);

  const sprintDone = mode === 'sprint' && sprint.sprintFound.size >= 6;
  const chainDone = mode === 'chain' && chain.chainStep >= 6;
  const gameOver =
    sprintDone ||
    chainDone ||
    ((mode === 'locate' || mode === 'reverse' || mode === 'memory' || mode === 'interval') &&
      total >= TOTAL_QUESTIONS &&
      feedback === null);

  // Save best score on game over
  useEffect(() => {
    if (!gameOver) return;
    if (mode === 'sprint') saveBest(mode, difficulty, sprint.sprintElapsed);
    else if (mode === 'chain') saveBest(mode, difficulty, chain.chainStep);
    else saveBest(mode, difficulty, score);
  }, [gameOver, mode, difficulty, score, sprint.sprintElapsed, chain.chainStep]);

  const memoryShowMs = useCallback((diff: Difficulty) => (diff === 'easy' ? 2000 : diff === 'medium' ? 1200 : 600), []);

  const nextQuestion = useCallback(
    (diff: Difficulty) => {
      setFeedback(null);
      setSelectedAnswer(null);
      setCorrectHighlight([]);
      if (mode === 'interval') {
        setIntervalQ(generateIntervalQuestion(diff));
        setQuestion(null);
      } else {
        const q = generateQuestion(diff, mode);
        setQuestion(q);
        if (mode === 'memory') {
          setMemoryPhase('show');
          safeTimeout(() => setMemoryPhase('guess'), memoryShowMs(diff));
        }
      }
      startTimer(diff);
    },
    [startTimer, mode, safeTimeout, memoryShowMs],
  );

  const startGame = useCallback(
    (diff?: Difficulty, m?: GameMode) => {
      const d = diff ?? difficulty;
      const currentMode = m ?? mode;
      setScore(0);
      setTotal(0);
      setStreak(0);
      setBestStreak(0);
      setFeedback(null);
      setSelectedAnswer(null);
      setCorrectHighlight([]);
      sprint.setSprintFound(new Set());
      sprint.setSprintElapsed(0);
      chain.setChainStep(0);

      if (currentMode === 'sprint' || currentMode === 'chain') {
        const key = NOTES[Math.floor(Math.random() * 12)];
        const voicings = generateVoicings(key);
        const grouped = groupByDegree(voicings);
        const optimal = findOptimalCombination(grouped);
        setQuestion({
          key,
          degree: currentMode === 'chain' ? 1 : 0,
          voicing: optimal[0],
          allVoicings: voicings,
          optimal,
          reverseOptions: [],
        });
        if (currentMode === 'sprint') sprint.startSprint();
        if (currentMode === 'chain') chain.startChain();
        stopTimer();
        setQuestionTimer(0);
      } else if (currentMode === 'interval') {
        setIntervalQ(generateIntervalQuestion(d));
        setQuestion(null);
        startTimer(d);
      } else {
        setQuestion(generateQuestion(d, currentMode));
        if (currentMode === 'memory') {
          setMemoryPhase('show');
          safeTimeout(() => setMemoryPhase('guess'), memoryShowMs(d));
        }
        startTimer(d);
      }
    },
    [difficulty, mode, startTimer, stopTimer, safeTimeout, setQuestionTimer, memoryShowMs, sprint, chain],
  );

  // Sprint elapsed timer
  useEffect(() => {
    if (mode !== 'sprint' || !question || sprint.sprintFound.size >= 6 || !sprint.sprintStartRef.current) return;
    const id = setInterval(() => sprint.setSprintElapsed(sprint.elapsedSince()), 200);
    return () => clearInterval(id);
  }, [mode, question, sprint]);

  // Timer expired → auto wrong (locate/reverse/memory/interval only)
  useEffect(() => {
    if (
      questionTimer !== 0 ||
      !question ||
      feedback ||
      total >= TOTAL_QUESTIONS ||
      !(mode === 'locate' || mode === 'reverse' || mode === 'memory' || mode === 'interval')
    )
      return;
    setTotal((n) => n + 1);
    setStreak(0);
    setShakeKey((k) => k + 1);
    setFeedback('wrong');
    const correctKeys = question.allVoicings.filter((v) => v.degree === question.degree).map(voicingKey);
    setCorrectHighlight(correctKeys);
    stopTimer();
    safeTimeout(() => nextQuestion(difficulty), 2500);
  }, [questionTimer, question, feedback, total, difficulty, nextQuestion, mode, safeTimeout, stopTimer]);

  const recordAnswer = useCallback(
    (correct: boolean) => {
      stopTimer();
      setTotal((n) => n + 1);
      if (correct) {
        setScore((n) => n + 1);
        setStreak((s) => {
          const next = s + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
        setFeedback('correct');
      } else {
        setStreak(0);
        setShakeKey((k) => k + 1);
        setFeedback('wrong');
        const correctKeys = question
          ? question.allVoicings.filter((v: ChordVoicing) => v.degree === question.degree).map(voicingKey)
          : [];
        setCorrectHighlight(correctKeys);
      }
      safeTimeout(() => nextQuestion(difficulty), 2500);
    },
    [nextQuestion, difficulty, question, safeTimeout, stopTimer],
  );

  const handleSprintClick = useCallback(
    (chordKey: string) => {
      if (!question || sprintDone) return;
      const clicked = question.allVoicings.find((v) => voicingKey(v) === chordKey);
      if (!clicked || sprint.sprintFound.has(clicked.degree)) return;
      const next = new Set([...sprint.sprintFound, clicked.degree]);
      sprint.setSprintFound(next);
      setScore((n) => n + 1);
      if (next.size >= 6) sprint.finishSprint();
    },
    [question, sprintDone, sprint],
  );

  const handleChainClick = useCallback(
    (chordKey: string) => {
      if (!question || chainDone) return;
      const clicked = question.allVoicings.find((v) => voicingKey(v) === chordKey);
      if (!clicked) return;
      if (clicked.degree === chain.chainTarget) {
        setScore((n) => n + 1);
        setStreak((s) => {
          const next = s + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
        chain.advanceChain();
      } else {
        setStreak(0);
        setShakeKey((k) => k + 1);
      }
    },
    [question, chainDone, chain],
  );

  // Grid click handler dispatches by mode
  const handleGridClick = useCallback(
    (chordKey: string) => {
      if (!question) return;
      if (mode === 'sprint') return handleSprintClick(chordKey);
      if (mode === 'chain') return handleChainClick(chordKey);
      if (feedback) return;
      if (mode === 'memory') {
        setSelectedAnswer(chordKey);
        recordAnswer(voicingKey(question.voicing) === chordKey);
        return;
      }
      // Locate / interval (interval uses its own grid; locate uses voicings)
      setSelectedAnswer(chordKey);
      const correct = question.allVoicings.some((v) => v.degree === question.degree && voicingKey(v) === chordKey);
      recordAnswer(correct);
    },
    [question, feedback, mode, recordAnswer, handleSprintClick, handleChainClick],
  );

  // Reverse mode: click degree button
  const handleReverseAnswer = useCallback(
    (deg: number) => {
      if (!question || feedback) return;
      recordAnswer(deg === question.degree);
    },
    [question, feedback, recordAnswer],
  );

  const progress =
    mode === 'sprint' ? sprintFound.size / 6 : mode === 'chain' ? chainStep / 6 : total / TOTAL_QUESTIONS;
  const timerPct = questionTimer / DIFFICULTY_TIME[difficulty];

  // Streak milestones
  const streakEmoji = streak >= 10 ? '💥' : streak >= 5 ? '🔥🔥' : streak >= 3 ? '🔥' : null;

  return (
    <>
      <button
        onClick={() => {
          openGame();
          startGame();
        }}
        className="text-[11px] rounded border border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer text-center w-7 h-7 flex items-center justify-center"
        style={{ transition: 'all var(--transition)' }}
        title={t('practice')}
      >
        {'🎮'}
      </button>

      {mounted && (
        <div
          className="fixed z-50 flex items-center justify-center bg-crust/95 backdrop-blur-sm"
          style={
            rotated
              ? {
                  width: '100vh',
                  height: '100vw',
                  transform: `rotate(90deg) scale(${visible ? 1 : 0.92})`,
                  transformOrigin: 'top left',
                  left: '100vw',
                  top: 0,
                  opacity: visible ? 1 : 0,
                  transition: 'opacity 0.25s ease, transform 0.25s ease',
                }
              : {
                  inset: 0,
                  opacity: visible ? 1 : 0,
                  transform: `scale(${visible ? 1 : 0.92})`,
                  transition: 'opacity 0.25s ease, transform 0.25s ease',
                }
          }
        >
          <div
            className="w-fit max-w-[95vw] mx-3 rounded-2xl border border-surface0 bg-mantle text-txt overflow-y-auto flex flex-col"
            style={{
              maxHeight: rotated ? 'calc(100vw - 1.5rem)' : '90vh',
              maxWidth: rotated ? 'calc(100vh - 1.5rem)' : '95vw',
              opacity: visible ? 1 : 0,
              transform: visible ? 'scale(1)' : 'scale(0.92)',
              transition: 'opacity 0.25s ease, transform 0.25s ease',
            }}
          >
            {/* Progress bar */}
            <div className="h-1 bg-surface0 rounded-t-2xl overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${progress * 100}%`, background: 'var(--blue)', transition: 'width 0.3s' }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-blue">{t('practice')}</h2>
                {streakEmoji && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full bg-peach/20 text-peach font-bold"
                    style={{ animation: 'scaleIn 0.2s ease' }}
                  >
                    {streakEmoji} {streak}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-lg font-bold text-txt leading-none">
                    {score}
                    <span className="text-overlay0 text-sm font-normal">/{total}</span>
                  </div>
                </div>
                <button
                  onClick={closeGame}
                  className="w-8 h-8 rounded-lg bg-surface0 text-overlay1 hover:text-txt flex items-center justify-center cursor-pointer"
                  style={{ transition: 'all var(--transition)' }}
                  aria-label={t('close')}
                >
                  {'✕'}
                </button>
              </div>
            </div>

            {/* Mode & Difficulty */}
            <div className="flex gap-1.5 px-5 pb-3 flex-wrap">
              {(['locate', 'reverse', 'sprint', 'chain', 'memory', 'interval'] as GameMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    startGame(undefined, m);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg cursor-pointer ${mode === m ? 'bg-blue/20 text-blue font-semibold' : 'text-overlay0 hover:text-subtext0'}`}
                  style={{ transition: 'all var(--transition)' }}
                >
                  {m === 'locate'
                    ? t('gameLocate')
                    : m === 'reverse'
                      ? t('gameReverse')
                      : m === 'sprint'
                        ? t('gameSprint')
                        : m === 'memory'
                          ? t('gameMemory')
                          : m === 'interval'
                            ? t('gameInterval')
                            : t('gameChain')}
                </button>
              ))}
              {(mode === 'locate' || mode === 'reverse' || mode === 'memory' || mode === 'interval') && (
                <>
                  <div className="w-px bg-surface0 mx-1" />
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setDifficulty(d);
                        startGame(d);
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg cursor-pointer ${difficulty === d ? 'bg-peach/20 text-peach font-semibold' : 'text-overlay0 hover:text-subtext0'}`}
                      style={{ transition: 'all var(--transition)' }}
                    >
                      {d === 'easy' ? '⭐' : d === 'medium' ? '⭐⭐' : '⭐⭐⭐'}
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Content */}
            <div className="px-5 pb-5 flex-1">
              {gameOver ? (
                <div className="text-center py-10">
                  <div className="text-5xl mb-3" style={{ animation: 'scaleIn 0.3s ease' }}>
                    {mode === 'sprint'
                      ? '⚡'
                      : mode === 'chain'
                        ? '🔗'
                        : score / Math.max(total, 1) >= 0.8
                          ? '🏆'
                          : score / Math.max(total, 1) >= 0.5
                            ? '👍'
                            : '💪'}
                  </div>
                  {mode === 'sprint' ? (
                    <div className="text-2xl font-bold mb-1">{t('gameSprintComplete', { time: sprintElapsed })}</div>
                  ) : mode === 'chain' ? (
                    <div className="text-2xl font-bold mb-1">{'6/6 🎉'}</div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold mb-1">
                        {score}/{total}
                      </div>
                      <div className="text-sm text-overlay1 mb-1">
                        {Math.round((score / Math.max(total, 1)) * 100)}%
                      </div>
                    </>
                  )}
                  {bestStreak > 1 && (
                    <div className="text-xs text-peach mb-4">
                      {'🔥'} {t('gameStreak', { count: bestStreak })}
                    </div>
                  )}
                  {(() => {
                    const best = getBest(mode, difficulty);
                    if (best === null) return null;
                    return (
                      <div className="text-xs text-overlay1 mb-4">
                        {mode === 'sprint'
                          ? `⚡ ${t('gameBest')}: ${best}s`
                          : `🏅 ${t('gameBest')}: ${best}/${TOTAL_QUESTIONS}`}
                      </div>
                    );
                  })()}
                  <button
                    onClick={() => startGame()}
                    className="px-8 py-2.5 rounded-xl bg-blue text-crust font-semibold cursor-pointer hover:opacity-90 text-sm"
                    style={{ transition: 'all var(--transition)' }}
                  >
                    {t('gamePlayAgain')}
                  </button>
                </div>
              ) : question ? (
                <>
                  {/* Per-question timer bar (locate/reverse only) */}
                  {(mode === 'locate' || mode === 'reverse' || mode === 'memory' || mode === 'interval') && (
                    <div className="h-0.5 bg-surface0 rounded-full mb-3 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${timerPct * 100}%`,
                          background: timerPct > 0.3 ? 'var(--blue)' : 'var(--red)',
                          transition: 'width 1s linear, background 0.3s',
                        }}
                      />
                    </div>
                  )}

                  {/* Sprint timer */}
                  {mode === 'sprint' && (
                    <div className="text-center mb-2 text-sm font-mono text-overlay1">
                      {t('gameSprintProgress', { found: sprintFound.size, elapsed: sprintElapsed })}
                    </div>
                  )}

                  {/* Chain progress */}
                  {mode === 'chain' && (
                    <div className="text-center mb-2 text-sm text-overlay1">
                      {t('gameChainProgress', { step: chainStep, degree: DEGREE_LABELS[chainTarget] })}
                    </div>
                  )}

                  {/* Question card */}
                  <div
                    key={shakeKey}
                    className={`rounded-xl border bg-base p-4 mb-3 ${
                      feedback === 'correct'
                        ? 'border-green/50 bg-green/5'
                        : feedback === 'wrong'
                          ? 'border-red/50 bg-red/5'
                          : 'border-surface0'
                    }`}
                    style={{
                      transition: 'border-color 0.2s, background 0.2s',
                      animation: feedback === 'wrong' ? 'shake 0.4s ease' : undefined,
                    }}
                  >
                    {/* Prompt */}
                    <div className="text-center mb-3">
                      <div className="text-xl font-bold">
                        {mode === 'reverse'
                          ? '?'
                          : mode === 'sprint'
                            ? t('gameFound', { count: sprintFound.size })
                            : mode === 'chain'
                              ? DEGREE_LABELS[chainTarget]
                              : DEGREE_LABELS[question.degree]}
                      </div>
                      <div className="text-xs text-overlay1 mt-1">
                        {mode === 'locate' &&
                          t('gameLocatePrompt', {
                            key: NOTE_DISPLAY[question.key],
                            degree: DEGREE_LABELS[question.degree],
                          })}
                        {mode === 'reverse' && t('gameReversePrompt', { key: NOTE_DISPLAY[question.key] })}
                        {mode === 'sprint' && t('gameSprintPrompt', { key: NOTE_DISPLAY[question.key] })}
                        {mode === 'chain' &&
                          t('gameChainPrompt', { key: NOTE_DISPLAY[question.key], degree: DEGREE_LABELS[chainTarget] })}
                        {mode === 'memory' && t('gameMemoryPrompt', { key: NOTE_DISPLAY[question.key] })}
                      </div>
                    </div>

                    {/* Shape Grid */}
                    <div className="overflow-x-auto">
                      <ShapeGrid
                        voicings={question.allVoicings}
                        optimal={
                          mode === 'reverse'
                            ? [question.voicing]
                            : mode === 'memory'
                              ? memoryPhase === 'show'
                                ? [question.voicing]
                                : []
                              : question.optimal
                        }
                        light={isLight}
                        totalFrets={12}
                        hoveredChord={selectedAnswer}
                        onClickChord={
                          mode !== 'reverse' && !(mode === 'memory' && memoryPhase === 'show')
                            ? handleGridClick
                            : undefined
                        }
                        hideLabels
                        monoColor={mode === 'reverse' || mode === 'memory' || difficulty !== 'easy'}
                      />
                    </div>

                    {/* Show correct answer on wrong */}
                    {feedback === 'wrong' && correctHighlight.length > 0 && (
                      <div className="text-center mt-2 text-xs text-red">
                        {t('gameWrongAnswer', {
                          name: question.voicing.name,
                          degree: DEGREE_LABELS[question.degree],
                          shape: question.voicing.shapeOrigin,
                          fret: question.voicing.barrePosition,
                        })}
                      </div>
                    )}

                    {/* Show chord info on correct */}
                    {feedback === 'correct' && mode !== 'sprint' && mode !== 'chain' && (
                      <div className="text-center mt-2 text-xs text-green">
                        {question.voicing.name} · {DEGREE_LABELS[question.degree]} · {question.voicing.shapeOrigin} @{' '}
                        {question.voicing.barrePosition}
                      </div>
                    )}
                  </div>

                  {/* Reverse choices */}
                  {mode === 'reverse' && (
                    <div className="grid grid-cols-3 gap-2">
                      {question.reverseOptions.map((deg) => (
                        <button
                          key={deg}
                          onClick={() => handleReverseAnswer(deg)}
                          className="py-3 rounded-xl bg-surface0 text-subtext1 font-semibold text-sm cursor-pointer hover:bg-surface1 hover:text-txt"
                          style={{ transition: 'all var(--transition)' }}
                        >
                          {DEGREE_LABELS[deg]}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : intervalQ && mode === 'interval' ? (
                <>
                  <div
                    key={shakeKey}
                    className={`rounded-xl border bg-base p-4 mb-3 ${
                      feedback === 'correct'
                        ? 'border-green/50 bg-green/5'
                        : feedback === 'wrong'
                          ? 'border-red/50 bg-red/5'
                          : 'border-surface0'
                    }`}
                    style={{
                      transition: 'border-color 0.2s, background 0.2s',
                      animation: feedback === 'wrong' ? 'shake 0.4s ease' : undefined,
                    }}
                  >
                    <div className="text-center mb-3">
                      <div className="text-xl font-bold text-blue">{intervalQ.targetInterval}</div>
                      <div className="text-xs text-overlay1 mt-1">
                        {t('gameIntervalPrompt', {
                          interval: intervalQ.targetInterval,
                          note: intervalQ.rootNote,
                          string: STRING_NAMES[intervalQ.rootSi],
                          fret: intervalQ.rootFret,
                        })}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Fretboard
                        voicings={[]}
                        optimal={[]}
                        light={isLight}
                        totalFrets={12}
                        markers={[
                          { si: intervalQ.rootSi, fret: intervalQ.rootFret, label: 'R', color: 'var(--red)' },
                          ...(feedback
                            ? intervalQ.targetPositions
                                .filter(([, f]) => f <= 12)
                                .map(([si, f]) => ({
                                  si,
                                  fret: f,
                                  label: intervalQ.targetInterval,
                                  color: 'var(--green)',
                                }))
                            : []),
                        ]}
                        onFretClick={(si, f) => {
                          if (feedback) return;
                          const correct = intervalQ.targetPositions.some(([ts, tf]) => ts === si && tf === f);
                          recordAnswer(correct);
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
