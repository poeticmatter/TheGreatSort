import { useEffect, useState } from 'react';
import { GameMode, GamePhase, ToolInstance } from '../../types';
import { DailyState, Move, generateLevel, generateTools, stringToSeed, gradeLevel } from '../utils/gameLogic';
import { getTodayDateString } from '../utils/dateUtils';
import { CardItem } from '../../types';

export interface PersistenceState {
  movesHistory: Move[];
  phase: GamePhase;
  toolsAvailable: ToolInstance[];
  levelScore: number;
  optimalScore: number | null;
  list: CardItem[]; // Needed for restoring visual state if daily completed
}

export const loadCareerTools = (): ToolInstance[] | null => {
  try {
    const saved = localStorage.getItem('career_tools');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const saveCareerTools = (tools: ToolInstance[]) => {
  localStorage.setItem('career_tools', JSON.stringify(tools));
};

export const useGamePersistence = (
  gameMode: GameMode,
  currentState: PersistenceState,
  isGameLoaded: boolean
) => {
  // Load Daily State Helper
  const loadDaily = (): { state: DailyState | null, result: {score: number, optimal: number | null} | null } => {
    const today = getTodayDateString();
    try {
      const savedStateStr = localStorage.getItem(`daily_state_${today}`);
      const savedResultStr = localStorage.getItem(`daily_result_${today}`);

      return {
        state: savedStateStr ? JSON.parse(savedStateStr) : null,
        result: savedResultStr ? JSON.parse(savedResultStr) : null
      };
    } catch (e) {
      console.error("Failed to load daily state", e);
      return { state: null, result: null };
    }
  };

  const [loadedState, setLoadedState] = useState<DailyState | null>(() => loadDaily().state);
  const [dailyResult, setDailyResult] = useState<{score: number, optimal: number | null} | null>(() => loadDaily().result);

  // Cleanup old daily states on mount
  useEffect(() => {
    const today = getTodayDateString();
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('daily_state_') && key !== `daily_state_${today}`) {
        localStorage.removeItem(key);
      }
    });
  }, []);

  // Reload when switching back to DAILY
  useEffect(() => {
    if (gameMode === 'DAILY') {
        const { state, result } = loadDaily();
        setLoadedState(state);
        setDailyResult(result);
    }
  }, [gameMode]);

  // Save Effect
  useEffect(() => {
    if (!isGameLoaded) return;
    if (gameMode !== 'DAILY') return;

    const today = getTodayDateString();

    // Save Result if Phase is RESULTS
    if (currentState.phase === GamePhase.RESULTS) {
      localStorage.setItem(`daily_result_${today}`, JSON.stringify({
        score: currentState.levelScore,
        optimal: currentState.optimalScore
      }));
    }

    // Save State
    // If inspecting, save as PLANNING to allow resume
    const phaseToSave = currentState.phase === GamePhase.INSPECTING ? GamePhase.PLANNING : currentState.phase;

    const stateToSave: DailyState = {
      date: today,
      moves: currentState.movesHistory,
      phase: phaseToSave,
      tools: currentState.toolsAvailable
    };

    localStorage.setItem(`daily_state_${today}`, JSON.stringify(stateToSave));

  }, [
    gameMode,
    currentState.phase,
    currentState.levelScore,
    currentState.optimalScore,
    currentState.movesHistory,
    currentState.toolsAvailable,
    isGameLoaded
  ]);

  return {
    loadedState,
    dailyResult
  };
};
