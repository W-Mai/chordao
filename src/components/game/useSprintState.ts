import { useCallback, useRef, useState } from 'react';

export function useSprintState() {
  const [sprintFound, setSprintFound] = useState<Set<number>>(new Set());
  const [sprintElapsed, setSprintElapsed] = useState(0);
  const sprintStartRef = useRef(0);

  const startSprint = useCallback(() => {
    sprintStartRef.current = Date.now();
    setSprintFound(new Set());
    setSprintElapsed(0);
  }, []);

  const finishSprint = useCallback(() => {
    setSprintElapsed(Math.floor((Date.now() - sprintStartRef.current) / 1000));
  }, []);

  const elapsedSince = useCallback(() => Math.floor((Date.now() - sprintStartRef.current) / 1000), []);

  return {
    sprintFound,
    setSprintFound,
    sprintElapsed,
    setSprintElapsed,
    sprintStartRef,
    startSprint,
    finishSprint,
    elapsedSince,
  };
}
