import { useRef, useCallback, useEffect } from 'react';
import { GamePhase } from '../../types';
import { createInspectionStream, InspectionYield } from '../utils/gameLogic';
import { useGameEngine } from './useGameEngine';

export const useGameLoop = (
  engine: ReturnType<typeof useGameEngine>,
  onComplete?: () => void
) => {
  const inspectionIndex = useRef(0);
  const inspectionIterator = useRef<Generator<InspectionYield> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep ref updated to avoid stale closures in the recursive timeout
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const processNextStepWrapper = useCallback(() => {
     if (!inspectionIterator.current) return;

     const result = inspectionIterator.current.next();

     if (result.done) {
         if (onCompleteRef.current) {
            onCompleteRef.current();
         }
         // Removed direct setPhase call; delegated to onComplete
         return;
     }

     const { list: updatedList, scoreDelta, detectedMode: mode, index } = result.value;

     engine.actions.setList(updatedList);
     if (scoreDelta > 0) {
        engine.actions.setLevelScore(prev => prev + scoreDelta);
     }
     if (mode !== null) {
        engine.actions.setDetectedMode(mode);
     }

     // Timing Logic
     const currentItem = updatedList[index];
     let delay = 400;
     if (currentItem.status === 'safe' || currentItem.status === 'eliminated') {
         delay = 600;
     }

     timeoutRef.current = setTimeout(processNextStepWrapper, delay);
  }, [engine.actions]);

  const startInspection = () => {
    engine.actions.setPhase(GamePhase.INSPECTING);
    inspectionIndex.current = 0;
    engine.actions.setDetectedMode(null);

    // Initialize generator
    inspectionIterator.current = createInspectionStream(engine.state.list);

    // Kick off
    processNextStepWrapper();
  };

  const stopLoop = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    inspectionIterator.current = null;
  };

  return {
    startInspection,
    stopLoop
  };
};
