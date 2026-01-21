import { useRef, useCallback } from 'react';
import { GamePhase } from '../../types';
import { createInspectionStream, InspectionYield } from '../utils/gameLogic';
import { useGameEngine } from './useGameEngine';

export const useGameLoop = (engine: ReturnType<typeof useGameEngine>) => {
  const inspectionIndex = useRef(0);
  const inspectionIterator = useRef<Generator<InspectionYield> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // We need a ref to the list to ensure the generator gets the latest (or stable) version when starting
  // However, `createInspectionStream` takes the list as argument.
  // When `startInspection` is called, we pass `engine.state.list`.

  const processNextStepWrapper = useCallback(() => {
     if (!inspectionIterator.current) return;

     const result = inspectionIterator.current.next();

     if (result.done) {
         engine.actions.setPhase(GamePhase.RESULTS);
         // If Daily mode, dailyCompleted will be handled by Facade or Engine logic?
         // Engine has `setDailyCompleted`. The Loop doesn't know about "Daily".
         // But the Loop knows the game ended.
         // Facade should probably watch Phase change to Results and set DailyCompleted?
         // Or Loop accepts a callback?
         // Original: setDailyCompleted(prev => gameMode === 'DAILY' ? true : prev);
         // The Loop is mode-agnostic.
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
