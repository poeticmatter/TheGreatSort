import { useEffect, useState, useRef } from 'react';
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
  isGameLoaded: boolean,
  sessionDate: string
) => {
  const [loadedState, setLoadedState] = useState<SaveStateSchema | null>(null);
  const [dailyResult, setDailyResult] = useState<DailyResult | null>(null);
  const [persistenceLoaded, setPersistenceLoaded] = useState(false);

  const [isLocked, setIsLocked] = useState(false);

  // NEW: Guard ref
  const historyRecordedRef = useRef(false);

  // Load Daily Data
  const loadDaily = () => {
    const state = PersistenceService.loadDailyState(sessionDate);
    const result = PersistenceService.getDailyResult(sessionDate);
    const locked = localStorage.getItem(`tgs_daily_lock_${sessionDate}`) === 'true';
    return { state, result, locked };
  };

  // Initial Load & Mode Change
  useEffect(() => {
    if (gameMode === 'DAILY') {
      const { state, result, locked } = loadDaily();
      setLoadedState(state);
      setDailyResult(result);
      setIsLocked(locked);

      // Prevent double-counting history if reloading on Results screen
      if (state?.snapshot?.phase === GamePhase.RESULTS) {
        historyRecordedRef.current = true;
      } else {
        historyRecordedRef.current = false;
      }
    } else {
      setIsLocked(false);
      historyRecordedRef.current = false;
    }
    setPersistenceLoaded(true);
  }, [gameMode, sessionDate]);

  // Reset Logic: Reset guard when sessionDate or currentSeed changes
  useEffect(() => {
    historyRecordedRef.current = false;
  }, [sessionDate, currentState.currentSeed]);


  // Cleanup old keys (Cleanup Policy)
  useEffect(() => {
    // Rudimentary cleanup of old daily keys from previous format if they exist
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('daily_state_') && key !== `daily_state_${sessionDate}`) {
        localStorage.removeItem(key);
      }
    });
  }, [sessionDate]);

  // Manual Persistence Trigger
  const persistResult = () => {
    if (gameMode !== 'DAILY') return;
    const today = sessionDate;

    // A. Update History (High Score & Attempts)
    PersistenceService.updateDailyHistory(today, currentState.levelScore);

    // B. Save Last Result
    const newResult = {
      score: currentState.levelScore,
      date: today
    };
    PersistenceService.saveDailyResult(today, newResult);

    // C. Update Local State (High Score Sync)
    const historyEntry = PersistenceService.getDailyHistoryEntry(today);
    if (historyEntry) {
      setDailyResult({
        score: historyEntry.highScore,
        date: today,
      });
    } else {
      setDailyResult(newResult);
    }

    // D. Lock and Mark Recorded
    setIsLocked(true);
    historyRecordedRef.current = true;
  };

  // Save Effect (Snapshots Only)
  useEffect(() => {
    if (!isGameLoaded) return;
    if (gameMode !== 'DAILY') return;

    // Use sessionDate from prop, not fresh date
    const today = sessionDate;

    // Save State (Snapshots)
    // If inspecting, we save as PLANNING so we can resume smoothly
    const phaseToSave = currentState.phase === GamePhase.INSPECTING ? GamePhase.PLANNING : currentState.phase;

    PersistenceService.saveDailyState(today, {
      puzzleId: currentState.currentSeed || 0, // Should always exist for Daily
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
    currentState.currentSeed,
    sessionDate
  ]);

  return {
    loadedState,
    dailyResult,
    isLocked,
    persistenceLoaded,
    persistResult
  };
};
