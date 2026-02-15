import { useRef, useCallback, useEffect, Dispatch } from 'react';
import { GamePhase, CardItem } from '../../types';
import { createInspectionStream, InspectionYield } from '../utils/gameLogic';
import { GameAction } from '../reducers/gameState';

export const useInspectionLoop = (
  currentList: CardItem[],
  dispatch: Dispatch<GameAction>,
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
      return;
    }

    const { list: updatedList, scoreDelta, detectedMode: mode, index } = result.value;

    // Dispatch single atomic update
    dispatch({
      type: 'INSPECTION_STEP',
      payload: {
        list: updatedList,
        scoreDelta: scoreDelta,
        detectedMode: mode
      }
    });

    // Timing Logic
    const currentItem = updatedList[index];
    let delay = 400;
    if (currentItem.status === 'safe' || currentItem.status === 'eliminated') {
      delay = 600;
    }

    timeoutRef.current = setTimeout(processNextStepWrapper, delay);
  }, [dispatch]);

  const startInspection = useCallback(() => {
    dispatch({ type: 'SET_PHASE', payload: { phase: GamePhase.INSPECTING } });
    dispatch({ type: 'SET_DETECTED_MODE', payload: { mode: null } });

    inspectionIndex.current = 0;

    // Initialize generator from the passed list
    inspectionIterator.current = createInspectionStream(currentList);

    // Kick off
    processNextStepWrapper();
  }, [dispatch, currentList, processNextStepWrapper]);

  const stopLoop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    inspectionIterator.current = null;
  }, []);

  return {
    startInspection,
    stopLoop
  };
};
