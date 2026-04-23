import { useCallback, useRef, useState } from 'react';
import { DIFFICULTY_TIME, type Difficulty } from './gameLogic';

export function useGameTimer() {
  const [questionTimer, setQuestionTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      pendingTimeouts.current = pendingTimeouts.current.filter((t) => t !== id);
      fn();
    }, ms);
    pendingTimeouts.current.push(id);
    return id;
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback(
    (diff: Difficulty) => {
      stopTimer();
      const time = DIFFICULTY_TIME[diff];
      setQuestionTimer(time);
      timerRef.current = setInterval(() => {
        setQuestionTimer((v) => {
          if (v <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return v - 1;
        });
      }, 1000);
    },
    [stopTimer],
  );

  const clearPendingTimeouts = useCallback(() => {
    pendingTimeouts.current.forEach(clearTimeout);
    pendingTimeouts.current = [];
  }, []);

  return {
    questionTimer,
    setQuestionTimer,
    startTimer,
    stopTimer,
    safeTimeout,
    clearPendingTimeouts,
  };
}
