import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  NOTES,
  NOTE_DISPLAY,
  generateVoicings,
  groupByDegree,
  findOptimalCombination,
  voicingKey,
  type NoteName,
  type ChordVoicing,
} from './chordData';
import { ShapeGrid } from './ShapeGrid';

type GameMode = 'flash' | 'reverse' | 'findAll';
type Difficulty = 'easy' | 'medium' | 'hard';

const DEGREE_LABELS: Record<number, string> = { 1: 'I', 2: 'IIm', 3: 'IIIm', 4: 'IV', 5: 'V', 6: 'VIm' };
const BEGINNER_DEGREES = [1];
const EASY_DEGREES = [1, 4, 5];
const ALL_DEGREES = [1, 2, 3, 4, 5, 6];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomKey(): NoteName {
  return NOTES[Math.floor(Math.random() * 12)];
}

interface Question {
  key: NoteName;
  degree: number;
  voicing: ChordVoicing;
  allVoicings: ChordVoicing[];
  optimal: ChordVoicing[];
  reverseOptions: number[];
}

function generateQuestion(difficulty: Difficulty): Question {
  const key = randomKey();
  const voicings = generateVoicings(key);
  const grouped = groupByDegree(voicings);
  const optimal = findOptimalCombination(grouped);
  const degrees = difficulty === 'easy' ? BEGINNER_DEGREES : difficulty === 'medium' ? EASY_DEGREES : ALL_DEGREES;
  const degree = randomItem(degrees);
  const degVoicings = grouped.get(degree) ?? [];
  const voicing = randomItem(degVoicings);
  const options = new Set([degree]);
  while (options.size < 3) options.add(randomItem(ALL_DEGREES));
  const reverseOptions = [...options].sort(() => Math.random() - 0.5);
  return { key, degree, voicing, allVoicings: voicings, optimal, reverseOptions };
}

const TOTAL_QUESTIONS = 10;

export function Game() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<GameMode>('flash');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [question, setQuestion] = useState<Question | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rotated, setRotated] = useState(false);

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
    setTimeout(() => {
      setMounted(false);
      setOpen(false);
    }, 250);
  }, []);

  const isHard = difficulty === 'hard';
  const gameOver =
    (isHard && timeLeft <= 0 && open && total > 0) || (!isHard && total >= TOTAL_QUESTIONS && feedback === null);

  const startGame = useCallback(() => {
    setScore(0);
    setTotal(0);
    setStreak(0);
    setBestStreak(0);
    setFeedback(null);
    setSelectedAnswer(null);
    setQuestion(generateQuestion(difficulty));
    if (isHard) setTimeLeft(60);
  }, [difficulty, isHard]);

  useEffect(() => {
    if (!open || !isHard || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearInterval(timer);
  }, [open, isHard, timeLeft]);

  const nextQuestion = useCallback(() => {
    setFeedback(null);
    setSelectedAnswer(null);
    setQuestion(generateQuestion(difficulty));
  }, [difficulty]);

  const recordAnswer = useCallback(
    (correct: boolean) => {
      setTotal((n) => n + 1);
      if (correct) {
        setScore((n) => n + 1);
        setStreak((s) => {
          const next = s + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
      } else {
        setStreak(0);
        setShakeKey((k) => k + 1);
      }
      setFeedback(correct ? 'correct' : 'wrong');
      setTimeout(nextQuestion, correct ? 600 : 1200);
    },
    [nextQuestion],
  );

  const handleGridClick = useCallback(
    (chordKey: string) => {
      if (!question || feedback) return;
      setSelectedAnswer(chordKey);
      const correct = question.allVoicings.some((v) => v.degree === question.degree && voicingKey(v) === chordKey);
      recordAnswer(correct);
    },
    [question, feedback, recordAnswer],
  );

  const reverseOptions = question?.reverseOptions ?? [];

  const handleReverseAnswer = useCallback(
    (deg: number) => {
      if (!question || feedback) return;
      recordAnswer(deg === question.degree);
    },
    [question, feedback, recordAnswer],
  );

  const progress = isHard ? timeLeft / 60 : total / TOTAL_QUESTIONS;

  return (
    <>
      <button
        onClick={() => {
          openGame();
          startGame();
        }}
        className="text-[11px] py-1.5 rounded border border-surface0 text-overlay1 hover:text-blue hover:border-blue cursor-pointer text-center w-7 h-7 md:w-auto md:h-auto flex items-center justify-center"
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
                style={{
                  width: `${progress * 100}%`,
                  background: isHard ? (timeLeft > 15 ? 'var(--blue)' : 'var(--red)') : 'var(--blue)',
                  transition: 'width 0.3s, background 0.3s',
                }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-blue">{t('practice')}</h2>
                {/* Streak badge */}
                {streak > 1 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full bg-peach/20 text-peach font-bold"
                    style={{ animation: 'scaleIn 0.2s ease' }}
                  >
                    {'🔥'} {streak}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-lg font-bold text-txt leading-none">
                    {score}
                    <span className="text-overlay0 text-sm font-normal">/{total}</span>
                  </div>
                  {isHard && (
                    <div className={`text-xs font-mono ${timeLeft <= 10 ? 'text-red' : 'text-overlay1'}`}>
                      {t('gameTimer', { time: timeLeft })}
                    </div>
                  )}
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
              {(['flash', 'reverse', 'findAll'] as GameMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    startGame();
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg cursor-pointer ${mode === m ? 'bg-blue/20 text-blue font-semibold' : 'text-overlay0 hover:text-subtext0'}`}
                  style={{ transition: 'all var(--transition)' }}
                >
                  {m === 'flash' ? t('gameFlash') : m === 'reverse' ? t('gameReverse') : t('gameFindAll')}
                </button>
              ))}
              <div className="w-px bg-surface0 mx-1" />
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDifficulty(d);
                    startGame();
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg cursor-pointer ${difficulty === d ? 'bg-peach/20 text-peach font-semibold' : 'text-overlay0 hover:text-subtext0'}`}
                  style={{ transition: 'all var(--transition)' }}
                >
                  {d === 'easy' ? '⭐' : d === 'medium' ? '⭐⭐' : '⭐⭐⭐'}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="px-5 pb-5 flex-1">
              {gameOver ? (
                /* Game Over */
                <div className="text-center py-10">
                  <div className="text-5xl mb-3" style={{ animation: 'scaleIn 0.3s ease' }}>
                    {score / total >= 0.8 ? '🏆' : score / total >= 0.5 ? '👍' : '💪'}
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {score}/{total}
                  </div>
                  <div className="text-sm text-overlay1 mb-1">{Math.round((score / total) * 100)}%</div>
                  {bestStreak > 1 && (
                    <div className="text-xs text-peach mb-4">
                      {'🔥'} {t('practice')} {bestStreak}
                    </div>
                  )}
                  <button
                    onClick={startGame}
                    className="px-8 py-2.5 rounded-xl bg-blue text-crust font-semibold cursor-pointer hover:opacity-90 text-sm"
                    style={{ transition: 'all var(--transition)' }}
                  >
                    {t('gamePlayAgain')}
                  </button>
                </div>
              ) : question ? (
                <>
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
                        {mode === 'reverse' ? '?' : DEGREE_LABELS[question.degree]}
                      </div>
                      <div className="text-xs text-overlay1 mt-1">
                        {mode === 'flash' &&
                          t('gameFlashPrompt', {
                            key: NOTE_DISPLAY[question.key],
                            degree: DEGREE_LABELS[question.degree],
                          })}
                        {mode === 'reverse' && t('gameReversePrompt', { key: NOTE_DISPLAY[question.key] })}
                        {mode === 'findAll' &&
                          t('gameFindAllPrompt', {
                            key: NOTE_DISPLAY[question.key],
                            degree: DEGREE_LABELS[question.degree],
                          })}
                      </div>
                    </div>

                    {/* Shape Grid */}
                    {(mode === 'flash' || mode === 'findAll') && (
                      <div className="overflow-x-auto">
                        <ShapeGrid
                          voicings={question.allVoicings}
                          optimal={question.optimal}
                          light={document.documentElement.getAttribute('data-theme') === 'light'}
                          totalFrets={12}
                          hoveredChord={selectedAnswer}
                          onClickChord={handleGridClick}
                          hideLabels
                          monoColor={difficulty !== 'easy'}
                        />
                      </div>
                    )}

                    {/* Reverse: highlighted grid */}
                    {mode === 'reverse' && (
                      <div className="overflow-x-auto mb-3">
                        <ShapeGrid
                          voicings={question.allVoicings}
                          optimal={[question.voicing]}
                          light={document.documentElement.getAttribute('data-theme') === 'light'}
                          totalFrets={12}
                          hideLabels
                          monoColor={difficulty !== 'easy'}
                        />
                      </div>
                    )}
                  </div>

                  {/* Reverse choices */}
                  {mode === 'reverse' && (
                    <div className="grid grid-cols-3 gap-2">
                      {reverseOptions.map((deg) => (
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

                  {/* Feedback toast */}
                  {feedback && (
                    <div
                      className={`text-center text-sm font-bold mt-2 ${feedback === 'correct' ? 'text-green' : 'text-red'}`}
                      style={{ animation: 'scaleIn 0.2s ease' }}
                    >
                      {feedback === 'correct'
                        ? t('gameCorrect')
                        : t('gameWrongDetail', {
                            wrong: t('gameWrong'),
                            itWas: t('gameItWas'),
                            name: question.voicing.name,
                            shape: question.voicing.shapeOrigin,
                          })}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
