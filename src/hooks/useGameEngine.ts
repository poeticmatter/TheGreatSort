import { useState } from 'react';
import { CardItem, GamePhase, ToolInstance, ToolType, Move } from '../../types';
import { applyMove } from '../utils/gameLogic';
import { TOOL_REGISTRY } from '../tools';

export interface EngineState {
  level: number;
  levelScore: number;
  totalScore: number;
  totalOptimalScore: number;
  optimalScore: number | null;
  list: CardItem[];
  movesHistory: Move[];
  phase: GamePhase;
  toolsAvailable: ToolInstance[];
  detectedMode: 'ASC' | 'DESC' | null;
  selection: number | null;
  selectedToolInstanceId: string | null;
  shakeTools: number;
  dailyCompleted: boolean;
  currentSeed: number | undefined;
}

export const useGameEngine = (onMoveCommitted?: () => void) => {
  const [level, setLevel] = useState(1);
  const [levelScore, setLevelScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [totalOptimalScore, setTotalOptimalScore] = useState(0);
  const [optimalScore, setOptimalScore] = useState<number | null>(null);

  const [list, setList] = useState<CardItem[]>([]);
  const [movesHistory, setMovesHistory] = useState<Move[]>([]);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.PLANNING);
  const [detectedMode, setDetectedMode] = useState<'ASC' | 'DESC' | null>(null);

  const [toolsAvailable, setToolsAvailable] = useState<ToolInstance[]>([]);
  const [selectedToolInstanceId, setSelectedToolInstanceId] = useState<string | null>(null);
  const [selection, setSelection] = useState<number | null>(null);
  const [shakeTools, setShakeTools] = useState(0);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [currentSeed, setCurrentSeed] = useState<number | undefined>(undefined);

  // --- Actions ---

  const loadState = (state: Partial<EngineState>) => {
    if (state.level !== undefined) setLevel(state.level);
    if (state.levelScore !== undefined) setLevelScore(state.levelScore);
    if (state.totalScore !== undefined) setTotalScore(state.totalScore);
    if (state.totalOptimalScore !== undefined) setTotalOptimalScore(state.totalOptimalScore);
    if (state.optimalScore !== undefined) setOptimalScore(state.optimalScore);
    if (state.list !== undefined) setList(state.list);
    if (state.movesHistory !== undefined) setMovesHistory(state.movesHistory);
    if (state.phase !== undefined) setPhase(state.phase);
    if (state.toolsAvailable !== undefined) setToolsAvailable(state.toolsAvailable);
    if (state.detectedMode !== undefined) setDetectedMode(state.detectedMode);
    if (state.dailyCompleted !== undefined) setDailyCompleted(state.dailyCompleted);
    if (state.currentSeed !== undefined) setCurrentSeed(state.currentSeed);
  };

  const startLevel = (
    newLevel: number,
    newList: CardItem[],
    newTools: ToolInstance[],
    seed?: number
  ) => {
    setLevel(newLevel);
    setList(newList);
    setToolsAvailable(newTools);
    setCurrentSeed(seed);

    // Reset Level State
    setMovesHistory([]);
    setPhase(GamePhase.PLANNING);
    setLevelScore(0);
    setOptimalScore(null);
    setDetectedMode(null);
    setSelectedToolInstanceId(null);
    setSelection(null);
  };

  const resetStats = () => {
    setTotalScore(0);
    setTotalOptimalScore(0);
  };

  const commitMove = (newList: CardItem[], toolInstanceId: string, move: Move) => {
    setList(newList);
    setToolsAvailable(prev => prev.map(t =>
        t.instanceId === toolInstanceId ? { ...t, used: true } : t
    ));
    setMovesHistory(prev => [...prev, move]);
    setSelectedToolInstanceId(null);
    setSelection(null);

    if (onMoveCommitted) onMoveCommitted();
  };

  const executeMove = (toolInstanceId: string, targetIndex: number) => {
    const toolInstance = toolsAvailable.find(t => t.instanceId === toolInstanceId);
    if (!toolInstance || toolInstance.used) return;

    const toolType = toolInstance.type;
    const strategy = TOOL_REGISTRY[toolType];

    // Safety check if strategy exists (should always exist if types match)
    if (!strategy) return;

    let newList = [...list];
    let recordedMove: Move | null = null;

    if (strategy.requiresSelection) {
        if (selection === null) {
            setSelection(targetIndex);
            return;
        } else {
            // Validate move using strategy
            const isValid = strategy.isValid(list, targetIndex, selection);

            if (isValid) {
                // Apply move using gameLogic (which delegates to strategy now)
                newList = applyMove(list, toolType, targetIndex, selection);
                recordedMove = {
                    tool: toolType,
                    index: targetIndex,
                    targetIndex: selection,
                    // We can also use strategy to generate description if we wanted to be perfectly consistent,
                    // but generateMoves creates ALL moves.
                    // For now, we manually reconstruct the description string to match existing behavior.
                    // Or we could add a `describe(index, selection)` method to strategy later.
                    // For now, simple template string is fine as before.
                    description: `${toolType} ${selection} and ${targetIndex}`
                };
                commitMove(newList, toolInstanceId, recordedMove);
            } else {
                // Invalid selection logic:
                // If clicking same card, deselect. Else switch selection.
                if (selection === targetIndex) {
                    setSelection(null);
                } else {
                     setSelection(targetIndex);
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
         setSelectedToolInstanceId(toolInstanceId);
      } else {
         executeMove(toolInstanceId, selection);
      }
      return;
    }

    if (selectedToolInstanceId === toolInstanceId) {
      setSelectedToolInstanceId(null);
      setSelection(null);
    } else {
      setSelectedToolInstanceId(toolInstanceId);
      setSelection(null);
    }
  };

  const handleCardClick = (index: number) => {
    if (phase !== GamePhase.PLANNING) return;

    if (selectedToolInstanceId) {
      executeMove(selectedToolInstanceId, index);
      return;
    }

    if (selection === index) {
      setShakeTools(prev => prev + 1);
    } else {
      setSelection(index);
      setShakeTools(prev => prev + 1);
    }
  };

  const handleBackgroundClick = () => {
    if (phase === GamePhase.PLANNING) {
      setSelection(null);
      setSelectedToolInstanceId(null);
    }
  };

  return {
    state: {
      level, levelScore, totalScore, totalOptimalScore, optimalScore, list, phase,
      detectedMode, toolsAvailable, selectedToolInstanceId, selection, shakeTools,
      dailyCompleted, currentSeed, movesHistory
    },
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
      setTotalScore,
      setTotalOptimalScore
    }
  };
};
