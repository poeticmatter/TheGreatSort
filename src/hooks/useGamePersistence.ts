import { useEffect, useState } from 'react';
import { GameMode, GamePhase, ToolInstance, Move, CardItem } from '../../types';
import { PersistenceService } from '../services/persistence';
import { SaveStateSchema, DailyResult } from '../services/persistence/types';
import { getTodayDateString } from '../utils/dateUtils';

// Re-export specific helpers for backward compatibility if needed, 
// or mostly for cleaner imports in useGame
export const saveDailyScore = PersistenceService.updateDailyHistory;
export const getDailyEntry = PersistenceService.getDailyHistoryEntry;

export interface PersistenceState {
  movesHistory: Move[];
  phase: GamePhase;
  toolsAvailable: ToolInstance[];
  levelScore: number;
  optimalScore: number | null;
  list: CardItem[];
  currentSeed?: number;
}

export const useGamePersistence = (
  gameMode: GameMode,
  currentState: PersistenceState,
  isGameLoaded: boolean
) => {
  const [loadedState, setLoadedState] = useState<SaveStateSchema | null>(null);
  const [dailyResult, setDailyResult] = useState<DailyResult | null>(null);

  // Load Daily Data
  const loadDaily = () => {
    const today = getTodayDateString();
    const state = PersistenceService.loadDailyState(today);
    const result = PersistenceService.getDailyResult(today);
    return { state, result };
  };

  // Initial Load & Mode Change
  useEffect(() => {
    if (gameMode === 'DAILY') {
      const { state, result } = loadDaily();
      setLoadedState(state);
      setDailyResult(result);
    }
  }, [gameMode]);

  // Cleanup old keys (Cleanup Policy)
  useEffect(() => {
    // We can iterate generic keys if possible, or rely on service.
    // For now simple cleanup of old raw keys if we were doing that, 
    // but the service handles specific keys. 
    // We can implement a cleanup routine in the service later.
    const today = getTodayDateString();
    // Rudimentary cleanup of old daily keys from previous format if they exist
    // This is optional but good for hygiene
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('daily_state_') && key !== `daily_state_${today}`) {
        localStorage.removeItem(key);
      }
    });
  }, []);

  // Save Effect
  useEffect(() => {
    if (!isGameLoaded) return;
    if (gameMode !== 'DAILY') return;

    const today = getTodayDateString();

    // 1. Save Result if finished
    if (currentState.phase === GamePhase.RESULTS) {
      PersistenceService.saveDailyResult(today, {
        score: currentState.levelScore,
        // optimal: currentState.optimalScore // Optional: decide if we save this
      });
    }

    // 2. Save State (Snapshots)
    // If inspecting, we save as PLANNING so we can resume smoothly
    const phaseToSave = currentState.phase === GamePhase.INSPECTING ? GamePhase.PLANNING : currentState.phase;

    PersistenceService.saveDailyState(today, {
      seed: currentState.currentSeed || 0, // Should always exist for Daily
      moves: currentState.movesHistory,
      snapshot: {
        list: currentState.list,
        tools: currentState.toolsAvailable,
        phase: phaseToSave,
        levelScore: currentState.levelScore
      }
    });

  }, [
    gameMode,
    isGameLoaded,
    currentState.phase,
    currentState.levelScore,
    currentState.movesHistory,
    currentState.toolsAvailable,
    currentState.list,
    currentState.currentSeed
  ]);

  return {
    loadedState,
    dailyResult
  };
};

