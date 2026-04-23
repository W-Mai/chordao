import { useCallback, useState } from 'react';
import { CHAIN_ORDER } from './gameLogic';

export function useChainState() {
  const [chainTarget, setChainTarget] = useState(0);
  const [chainStep, setChainStep] = useState(0);

  const startChain = useCallback(() => {
    setChainTarget(CHAIN_ORDER[0]);
    setChainStep(0);
  }, []);

  const advanceChain = useCallback(() => {
    setChainStep((prev) => {
      const next = prev + 1;
      if (next < CHAIN_ORDER.length) {
        setChainTarget(CHAIN_ORDER[next]);
      }
      return next;
    });
  }, []);

  return {
    chainTarget,
    setChainTarget,
    chainStep,
    setChainStep,
    startChain,
    advanceChain,
  };
}
