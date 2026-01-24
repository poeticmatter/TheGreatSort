import { useReducer } from 'react';
import { CardItem, GamePhase, ToolInstance, Move, ToolType } from '../../types';
import { applyMove } from '../utils/gameLogic';
import { TOOL_REGISTRY } from '../tools';
import { gameReducer, initialEngineState, EngineState } from '../reducers/gameReducer';

// Re-export EngineState to maintain API compatibility
export type { EngineState };

type SetStateAction<S> = S | ((prevState: S) => S);

function resolveState<S>(action: SetStateAction<S>, currentState: S): S {
    return typeof action === 'function' ? (action as any)(currentState) : action;
}

export const useGameEngine = (onMoveCommitted?: () => void) => {
  const [state, dispatch] = useReducer(gameReducer, initialEngineState);

  // Destructure for internal use and to match return structure
  const {
      level, levelScore, totalScore, totalOptimalScore, optimalScore, worstScore,
      list, movesHistory, phase, toolsAvailable, detectedMode,
      selection, selectedToolInstanceId, shakeTools, dailyCompleted, currentSeed
  } = state;

  // --- Actions ---

  const loadState = (partialState: Partial<EngineState>) => {
    dispatch({ type: 'LOAD_STATE', payload: partialState });
  };

  const startLevel = (
    newLevel: number,
    newList: CardItem[],
    newTools: ToolInstance[],
    seed?: number
  ) => {
    dispatch({
        type: 'START_LEVEL',
        payload: { level: newLevel, list: newList, tools: newTools, seed }
    });
  };

  const resetStats = () => {
    dispatch({
        type: 'SET_SCORES',
        payload: { totalScore: 0, totalOptimalScore: 0 }
    });
  };

  const commitMove = (newList: CardItem[], toolInstanceId: string, move: Move) => {
    dispatch({
        type: 'COMMIT_MOVE',
        payload: { newList, toolInstanceId, move }
    });
    if (onMoveCommitted) onMoveCommitted();
  };

  const executeMove = (toolInstanceId: string, targetIndex: number) => {
    const toolInstance = toolsAvailable.find(t => t.instanceId === toolInstanceId);
    if (!toolInstance || toolInstance.used) return;

    const toolType = toolInstance.type;
    const strategy = TOOL_REGISTRY[toolType];
    
    if (!strategy) return;

    let newList = [...list];
    let recordedMove: Move | null = null;
    let newSelection: number | null = selection;

    if (strategy.requiresSelection) {
        if (selection === null) {
            dispatch({ type: 'SET_SELECTION', payload: { selection: targetIndex } });
            return;
        } else {
            // Validate move using strategy
            const isValid = strategy.isValid(list, targetIndex, selection);

            if (isValid) {
                // Apply move using gameLogic
                newList = applyMove(list, toolType, targetIndex, selection);
                recordedMove = {
                    tool: toolType,
                    index: targetIndex,
                    targetIndex: selection,
                    description: `${toolType} ${selection} and ${targetIndex}`
                };
                commitMove(newList, toolInstanceId, recordedMove);
            } else {
                // Invalid selection logic:
                if (selection === targetIndex) {
                    dispatch({ type: 'SET_SELECTION', payload: { selection: null } });
                } else {
                    dispatch({ type: 'SET_SELECTION', payload: { selection: targetIndex } });
                }
            }
        }
    } else {
        // One-step tools checks
        if (!strategy.isValid(list, targetIndex)) return;

        newList = applyMove(list, toolType, targetIndex);
        recordedMove = {
            tool: toolType,
            index: targetIndex,
            description: `${toolType} at ${targetIndex}`
        };
        commitMove(newList, toolInstanceId, recordedMove);
    }
  };

  const handleToolClick = (toolInstanceId: string) => {
    if (phase !== GamePhase.PLANNING) return;
    const toolInstance = toolsAvailable.find(t => t.instanceId === toolInstanceId);
    if (!toolInstance || toolInstance.used) return;

    const strategy = TOOL_REGISTRY[toolInstance.type];
    if (!strategy) return;

    if (selection !== null) {
      if (strategy.requiresSelection) {
         dispatch({ type: 'SET_SELECTION', payload: { toolId: toolInstanceId } });
      } else {
         executeMove(toolInstanceId, selection);
      }
      return;
    }

    if (selectedToolInstanceId === toolInstanceId) {
      dispatch({ type: 'SET_SELECTION', payload: { selection: null, toolId: null } });
    } else {
      dispatch({ type: 'SET_SELECTION', payload: { selection: null, toolId: toolInstanceId } });
    }
  };

  const handleCardClick = (index: number) => {
    if (phase !== GamePhase.PLANNING) return;

    if (selectedToolInstanceId) {
      executeMove(selectedToolInstanceId, index);
      return;
    }

    if (selection === index) {
      dispatch({ type: 'TRIGGER_SHAKE' });
    } else {
      dispatch({ type: 'SET_SELECTION', payload: { selection: index } });
      dispatch({ type: 'TRIGGER_SHAKE' });
    }
  };

  const handleBackgroundClick = () => {
    if (phase === GamePhase.PLANNING) {
      dispatch({ type: 'SET_SELECTION', payload: { selection: null, toolId: null } });
    }
  };

  // State setters wrappers handling functional updates to strict API compatibility
  const setList = (action: SetStateAction<CardItem[]>) => 
      dispatch({ type: 'SET_LIST', payload: resolveState(action, list) });

  const setLevelScore = (action: SetStateAction<number>) => 
      dispatch({ type: 'SET_SCORES', payload: { levelScore: resolveState(action, levelScore) } });

  const setPhase = (action: SetStateAction<GamePhase>) => 
      dispatch({ type: 'SET_PHASE', payload: resolveState(action, phase) });

  const setDetectedMode = (action: SetStateAction<'ASC' | 'DESC' | null>) => 
      dispatch({ type: 'SET_DETECTED_MODE', payload: resolveState(action, detectedMode) });

  const setDailyCompleted = (action: SetStateAction<boolean>) => 
      dispatch({ type: 'SET_DAILY_COMPLETED', payload: resolveState(action, dailyCompleted) });

  const setOptimalScore = (action: SetStateAction<number | null>) => 
      dispatch({ type: 'SET_SCORES', payload: { optimalScore: resolveState(action, optimalScore) } });

  const setWorstScore = (action: SetStateAction<number | null>) => 
      dispatch({ type: 'SET_SCORES', payload: { worstScore: resolveState(action, worstScore) } });

  const setTotalScore = (action: SetStateAction<number>) => 
      dispatch({ type: 'SET_SCORES', payload: { totalScore: resolveState(action, totalScore) } });

  const setTotalOptimalScore = (action: SetStateAction<number>) => 
      dispatch({ type: 'SET_SCORES', payload: { totalOptimalScore: resolveState(action, totalOptimalScore) } });

  return {
    state,
    actions: {
      loadState,
      startLevel,
      resetStats,
      handleToolClick,
      handleCardClick,
      handleBackgroundClick,
      setList,
      setLevelScore,
      setPhase,
      setDetectedMode,
      setDailyCompleted,
      setOptimalScore,
      setWorstScore,
      setTotalScore,
      setTotalOptimalScore
    }
  };
};
