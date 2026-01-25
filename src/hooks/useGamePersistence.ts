import { useEffect, useState } from 'react';
import { GameMode, GamePhase, ToolInstance, Move, CardItem } from '../../types';
import { DailyState, generateLevel, generateTools, stringToSeed, gradeLevel } from '../utils/gameLogic';
import { getTodayDateString } from '../utils/dateUtils';

export interface PersistenceState {
  movesHistory: Move[];
  phase: GamePhase;
  toolsAvailable: ToolInstance[];
  levelScore: number;
  optimalScore: number | null;
  list: CardItem[]; // Needed for restoring visual state if daily completed
}

export interface DailyEntry {
  date: string;
  highScore: number;
  attempts: number;
  lastPlayedAt: number; // timestamp
  auditSeen?: boolean;
}

export type DailyHistory = Record<string, DailyEntry>;

const DAILY_HISTORY_KEY = 'tgs_daily_history';



export const getDailyEntry = (date: string): DailyEntry | null => {
  try {
    const historyStr = localStorage.getItem(DAILY_HISTORY_KEY);
    if (!historyStr) return null;

    const history: DailyHistory = JSON.parse(historyStr);
    return history[date] || null;
  } catch (e) {
    console.error("Failed to load daily entry", e);
    return null;
  }
};

export const markDailyAuditSeen = (date: string) => {
  try {
    const historyStr = localStorage.getItem(DAILY_HISTORY_KEY);
    const history: DailyHistory = historyStr ? JSON.parse(historyStr) : {};

    if (history[date]) {
      history[date].auditSeen = true;
      localStorage.setItem(DAILY_HISTORY_KEY, JSON.stringify(history));
    }
  } catch (e) {
    console.error("Failed to mark audit seen", e);
  }
};

export const saveDailyScore = (date: string, score: number) => {
  try {
    const historyStr = localStorage.getItem(DAILY_HISTORY_KEY);
    const history: DailyHistory = historyStr ? JSON.parse(historyStr) : {};

    const existing = history[date];
    const now = Date.now();

    if (existing) {
      history[date] = {
        ...existing,
        attempts: existing.attempts + 1,
        highScore: Math.max(existing.highScore, score),
        lastPlayedAt: now
      };
    } else {
      history[date] = {
        date,
        highScore: score,
        attempts: 1,
        lastPlayedAt: now
      };
    }

    localStorage.setItem(DAILY_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save daily score", e);
  }
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
        // Removed optimal score to prevent spoilers in storage
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
    // currentState.optimalScore, // Removed dependency as we don't save it
    currentState.movesHistory,
    currentState.toolsAvailable,
    isGameLoaded
  ]);

  return {
    loadedState,
    dailyResult
  };
};
