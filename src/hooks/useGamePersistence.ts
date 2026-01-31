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

  // Save Effect
  useEffect(() => {
    if (!isGameLoaded) return;
    if (gameMode !== 'DAILY') return;

    // Use sessionDate from prop, not fresh date
    const today = sessionDate;

    // 1. Save Result if finished (Idempotent Guard)
    if (currentState.phase === GamePhase.RESULTS) {
      if (!historyRecordedRef.current) {

        // A. Update History (High Score & Attempts)
        PersistenceService.updateDailyHistory(today, currentState.levelScore);

        // B. Save Last Result
        const newResult = {
          score: currentState.levelScore,
          date: today
          // optimal: currentState.optimalScore 
        };
        PersistenceService.saveDailyResult(today, newResult);

        // NEW: Critical UI Sync - Fetch updated history (High Score) to show in Audit
        const historyEntry = PersistenceService.getDailyHistoryEntry(today);
        if (historyEntry) {
          // Map history entry to DailyResult format for UI display
          // We use history 'highScore' as the 'score' for the audit view
          setDailyResult({
            score: historyEntry.highScore,
            date: today,
            // preserve optimal if needed or fetched
          });
        } else {
          // Fallback if fetch fails (shouldn't happen)
          setDailyResult(newResult);
        }

        // C. Lock Guard
        historyRecordedRef.current = true;
      }
    }
    // Note: We do NOT reset the guard here in 'else' block because the separate 
    // reset effect handles seed/date changes. Explicitly resetting on phase change 
    // might be risky if we bounce between results and inspecting. 
    // But existing code had logic for that. 
    // User Requirement: "Reset this ref must be reset to false whenever the sessionDate changes or the currentState.currentSeed changes".
    // This implies we don't reset it just because we left RESULTS phase (e.g. to inspect).
    // So excluding the 'else' block is correct based on new requirements.

    // 2. Save State (Snapshots)
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
    persistenceLoaded
  };
};
