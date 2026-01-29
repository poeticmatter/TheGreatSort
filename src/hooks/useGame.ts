import { useState, useEffect, useCallback, useRef } from 'react';
import { GameMode, GamePhase, ToolInstance, CardItem } from '../../types';
import { stringToSeed, generateLevel, generateTools, applyMove, calculateRelativeEfficiency } from '../utils/gameLogic';
import { getTodayDateString } from '../utils/dateUtils';
import { gradeLevel } from '../utils/gameLogic';
import { useGameContext } from '../context/GameContext';
import { useGamePersistence, saveDailyScore, getDailyEntry } from './useGamePersistence';
import { PersistenceService } from '../services/persistence';
import { useGameLoop } from './useGameLoop';
import { useAnalytics } from './useAnalytics';
import { useProjectedMetrics } from './useProjectedMetrics';
import { useSystemMood } from './useSystemMood';

export function useGame() {
  const { state, dispatch } = useGameContext();
  const [gameMode, setGameMode] = useState<GameMode>('DAILY');
  const [isGameLoaded, setIsGameLoaded] = useState(false);
  const [auditState, setAuditState] = useState<{ date: string, userScore: number } | null>(null);

  const { trackGameStart, trackGameComplete, trackToolInteraction, trackDailyAuditViewed } = useAnalytics();

  const [resistanceActive, setResistanceActive] = useState(false);
  const [resistancePending, setResistancePending] = useState(false);

  // --- Projection Engine & Mood System ---
  const {
    compliancePercentage,
    isZeroYield,
    yieldRatio,
    currentScore
  } = useProjectedMetrics(state.list, state.initialList || [], state.optimalScore);
  // Note: state.initialList guaranteed by reducer, fallback [] just in case

  const { mood, moodColor } = useSystemMood(yieldRatio);

  // --- Handlers (Pass-Through) ---

  const handleToolClick = (toolInstanceId: string) => {
    dispatch({ type: 'INTERACT_TOOL', payload: { toolInstanceId } });
    const tool = state.toolsAvailable.find(t => t.instanceId === toolInstanceId);
    if (tool) {
      trackToolInteraction(tool.type, 'select');
    }
  };

  const handleUndo = () => {
    if (state.movesHistory.length > 0) {
      dispatch({ type: 'UNDO_MOVE' });
      dispatch({ type: 'CANCEL_SELECTION' });
    }
  };

  const handleCardClick = (item: CardItem) => {
    const index = state.list.findIndex(i => i.id === item.id);
    if (index === -1) return;
    dispatch({ type: 'INTERACT_TILE', payload: { index } });
  };

  const handleBackgroundClick = () => {
    dispatch({ type: 'CANCEL_SELECTION' });
  };

  // --- Side Effect: Track Move Usage ---
  const prevMovesLength = useRef(state.movesHistory.length);
  useEffect(() => {
    if (state.movesHistory.length > prevMovesLength.current) {
      const lastMove = state.movesHistory[state.movesHistory.length - 1];
      trackToolInteraction(lastMove.tool, 'use');
    }
    prevMovesLength.current = state.movesHistory.length;
  }, [state.movesHistory, trackToolInteraction]);


  // --- Persistence ---
  const persistenceState = {
    movesHistory: state.movesHistory,
    phase: state.phase,
    toolsAvailable: state.toolsAvailable,
    levelScore: state.levelScore,
    optimalScore: state.optimalScore,
    worstScore: state.worstScore || null,
    list: state.list,
    currentSeed: state.currentSeed
  };

  const { loadedState, dailyResult } = useGamePersistence(gameMode, persistenceState, isGameLoaded);

  // --- Loop Callback ---
  const handleGameCompletion = useCallback(() => {
    if (gameMode === 'DAILY') {
      saveDailyScore(getTodayDateString(), state.levelScore);
      dispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: true } });
    }
    dispatch({ type: 'SET_PHASE', payload: { phase: GamePhase.RESULTS } });
    setResistancePending(true);

    dispatch({ type: 'SET_TOTAL_SCORE', payload: { score: state.totalScore + state.levelScore } });
    if (state.optimalScore) {
      dispatch({ type: 'SET_TOTAL_OPTIMAL_SCORE', payload: { score: state.totalOptimalScore + state.optimalScore } });
    }
    trackGameComplete(gameMode, state.levelScore, state.optimalScore);
  }, [gameMode, state.levelScore, dispatch, state.totalScore, state.totalOptimalScore, state.optimalScore, trackGameComplete]);

  // --- Loop ---
  const loop = useGameLoop(state.list, dispatch, handleGameCompletion);

  // --- Hydration & Initialization ---
  useEffect(() => {
    if (isGameLoaded) return;

    const today = getTodayDateString();

    if (gameMode === 'DAILY') {
      const seed = stringToSeed(today);

      if (loadedState) {
        // --- Resume from Save ---
        // If loadedState exists, it's already validated by useGamePersistence/Service

        // Reconstruct logic: We can either trust the snapshot (if available and valid) 
        // OR reconstruct from moves. The instructions said "Create a SaveStateSchema... minimal data required to reconstruct".
        // So we should reconstruct from moves to be "pure", but we stored a snapshot for convenience.
        // Let's use the reconstruction for robustness (it fixes corrupted states if logic changed),
        // or use snapshot if we trust it. 
        // For this refactor, let's Stick to the logic: "reconstruct the game (Seed, Move History)".

        let currentList = generateLevel(9, seed);
        let currentTools = generateTools(seed); // Fresh tools

        // If we have moves, replay them
        if (loadedState.moves) {
          loadedState.moves.forEach((move) => {
            currentList = applyMove(currentList, move.tool, move.index, move.targetIndex);
            // Mark tool used
            const toolIndex = currentTools.findIndex((t: ToolInstance) => t.type === move.tool && !t.used);
            if (toolIndex !== -1) currentTools[toolIndex].used = true;
          });
        }

        // Restore Phase
        let phase = GamePhase.PLANNING;
        if (loadedState.snapshot?.phase) {
          phase = loadedState.snapshot.phase;
        } else if (loadedState.moves.length > 0) {
          // Infer phase? Default planning.
        }

        dispatch({
          type: 'START_LEVEL',
          payload: {
            level: 1,
            list: currentList,
            tools: currentTools,
            seed: seed,
            movesHistory: loadedState.moves
          }
        });

        if (phase) {
          dispatch({ type: 'SET_PHASE', payload: { phase } });
        }

        // If it was results, handle scoring
        if (phase === GamePhase.RESULTS) {
          dispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: true } });
          const { score, gradedList } = gradeLevel(currentList);
          dispatch({ type: 'SET_LIST', payload: { list: gradedList } });
          dispatch({ type: 'SET_LEVEL_SCORE', payload: { score: score } });
        } else {
          dispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: false } });
          // Ensure list is set (START_LEVEL does it, but purely ensuring)
          dispatch({ type: 'SET_LIST', payload: { list: currentList } });
        }

      } else if (dailyResult) {
        // --- Completed but no state (maybe cleared cache but kept result?) ---
        // Or simplified result structure
        dispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: true } });
        dispatch({
          type: 'START_LEVEL',
          payload: {
            level: 1,
            list: generateLevel(9, seed),
            tools: generateTools(seed),
            seed: seed
          }
        });
        dispatch({ type: 'SET_PHASE', payload: { phase: GamePhase.RESULTS } });
        dispatch({ type: 'SET_LEVEL_SCORE', payload: { score: dailyResult.score } });
      } else {
        // --- New Game ---
        startLevel(1, 'DAILY');
      }
    } else {
      startLevel(1, gameMode);
    }

    setIsGameLoaded(true);
  }, [isGameLoaded, gameMode, dispatch, loadedState, dailyResult]);

  const startLevel = (lvl: number, modeOverride?: GameMode, seedOverride?: number) => {
    const activeMode = modeOverride || gameMode;

    let len = 0;
    let seed: number | undefined = undefined;
    let tools: ToolInstance[] = [];

    if (activeMode === 'DAILY') {
      len = 9;
      seed = stringToSeed(getTodayDateString());
      tools = generateTools(seed);
    } else if (activeMode === 'PRACTICE') {
      len = 9;
      seed = seedOverride !== undefined ? seedOverride : Math.random() * 1000000;
      tools = generateTools(seed);
    }

    const list = generateLevel(len, seed);

    dispatch({
      type: 'START_LEVEL',
      payload: {
        level: lvl,
        list,
        tools,
        seed
      }
    });

    if (seed !== undefined) {
      trackGameStart(activeMode, seed);
    }
  };

  const triggerResistance = useCallback(() => {
    setResistanceActive(true);
    setAuditState(null);
  }, []);

  // --- Reset / Burn Letter Handler ---
  const closeResistance = useCallback(() => {
    setResistanceActive(false);

    // Safety Net Reset: If core metric was violated (Zero Yield), we MUST reset the level entirely.
    // Logic: If the user was in resistance screen (likely triggered by Zero Yield or Audit),
    // We should enforce a retry cleanly.

    // Re-start level with same seed.
    if (state.currentSeed !== undefined) {
      // We use startLevel logic but need to be careful not to create NEW random seed if PRACTICE.
      // We want SAME seed.

      // Re-generate params
      const seed = state.currentSeed;
      // Note: startLevel(1, gameMode, seed) would work.
      // But startLevel is not in useCallback dependency array to avoid cycles if complex.
      // Let's implement minimal dispatch here or expose startLevel carefully.

      // Actually startLevel IS accessible here.
      // But dependencies? 'startLevel' depends on gameMode, which is in scope.

      // Let's replicate strict reset logic manually to be safe/atomic
      const list = generateLevel(9, seed);
      const tools = generateTools(seed); // Fresh tools

      dispatch({
        type: 'START_LEVEL',
        payload: {
          level: state.level,
          list,
          tools,
          seed
        }
      });

      dispatch({ type: 'RESET_STATS' }); // Optional: Reset score accumulation for this run
    }

  }, [state.currentSeed, state.level, dispatch]);

  // --- Effects ---

  // --- Worker Integration ---
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Worker
    workerRef.current = new Worker(new URL('../workers/gameSolver.worker.ts', import.meta.url), { type: 'module' });

    // Handle messages
    workerRef.current.onmessage = (e) => {
      const { id, optimalScore, worstScore } = e.data;

      if (id === state.currentSeed) {
        dispatch({ type: 'SET_OPTIMAL_SCORE', payload: { score: optimalScore } });
        if (worstScore !== undefined) {
          dispatch({ type: 'SET_WORST_SCORE', payload: { score: worstScore } });
        }

        // Cache solution
        if (id !== undefined && gameMode === 'DAILY') {
          PersistenceService.saveSolution(id, { optimalScore, worstScore });
        }
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [dispatch, state.currentSeed, gameMode]);

  // --- Resistance Check (Legacy + New Safety Net) ---
  useEffect(() => {
    // 1. Efficiency Check (Results Phase)
    if (gameMode === 'DAILY' &&
      state.phase === GamePhase.RESULTS &&
      state.optimalScore !== null &&
      state.worstScore !== null &&
      resistancePending) {

      const efficiency = calculateRelativeEfficiency(
        state.levelScore,
        state.optimalScore,
        state.worstScore
      );

      if (efficiency === 0) {
        const timer = setTimeout(() => {
          setResistanceActive(true);
          setResistancePending(false);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        setResistancePending(false);
      }
    }

    // 2. Zero-Yield Safety Net (Planning Phase / Active Play)
    // "If metrics.isZeroYield is true AND resistanceActive is false, immediately call triggerResistance()."
    if (isZeroYield && !resistanceActive && state.list.length > 0) {
      // Additional guard: Only if we have actually made moves or list is not empty (already checked in trigger)
      // But isZeroYield logic: (currentScore === 0 && list.length > 0).
      // If start of game score is 0? initialList score should not be 0 usually.
      // But if it is, we shouldn't lock out immediately?
      // calculateBatchScore of random list is rarely 0.
      // Yet, if random seed spawns a 0 score list, user is doomed?
      // IsZeroYield = currentScore == 0.
      // If initialScore == 0, then we might have issue.
      // But let's follow the instruction: "Trigger ... if isZeroYield".

      triggerResistance();
    }

  }, [
    gameMode, state.phase, state.optimalScore, state.worstScore, state.levelScore, resistancePending,
    isZeroYield, resistanceActive, state.list.length, triggerResistance
  ]);

  // Trigger Calculation
  useEffect(() => {
    if (state.list.length > 0 && state.optimalScore === null && workerRef.current) {

      // Cache Check
      if (state.currentSeed !== undefined && gameMode === 'DAILY') {
        const cached = PersistenceService.getSolution(state.currentSeed);
        if (cached) {
          dispatch({ type: 'SET_OPTIMAL_SCORE', payload: { score: cached.optimalScore } });
          if (cached.worstScore !== undefined) {
            dispatch({ type: 'SET_WORST_SCORE', payload: { score: cached.worstScore } });
          }
          return; // Skip calculation
        }
      }

      const mode = (gameMode === 'DAILY' || gameMode === 'RESULTS') ? 'BOTH' : 'OPTIMAL';

      let listToSolve = state.list;
      let toolsToSolve = state.toolsAvailable;

      if (state.currentSeed !== undefined) {
        listToSolve = generateLevel(9, state.currentSeed);
        toolsToSolve = generateTools(state.currentSeed);
      }

      workerRef.current.postMessage({
        list: listToSolve,
        tools: toolsToSolve,
        mode,
        id: state.currentSeed
      });
    }
  }, [state.list, state.toolsAvailable, state.optimalScore, state.currentSeed, gameMode]);

  const changeMode = (newMode: GameMode) => {
    setAuditState(null);
    loop.stopLoop();

    if (newMode === 'DAILY') {
      const today = getTodayDateString();
      // Check if we have a saved state/result safely
      const savedState = PersistenceService.loadDailyState(today);
      const savedResult = PersistenceService.getDailyResult(today);

      if (savedState || savedResult) {
        setGameMode('DAILY');
        setIsGameLoaded(false); // Trigger re-hydration
        return;
      }

      setGameMode(newMode);
      dispatch({ type: 'RESET_STATS' });
      dispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: false } });
      startLevel(1, 'DAILY');
    } else {
      setGameMode(newMode);
      dispatch({ type: 'RESET_STATS' });
      dispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: false } });
      startLevel(1, newMode);
    }
  };

  const nextLevel = () => {
    startLevel(1, 'PRACTICE');
  };

  const retryPractice = () => {
    if (gameMode === 'PRACTICE' && state.currentSeed !== undefined) {
      startLevel(1, 'PRACTICE', state.currentSeed);
    }
  };

  const retryDaily = () => {
    startLevel(1, 'DAILY');
  };

  const resetGame = () => {
    if (gameMode === 'DAILY') return;
    dispatch({ type: 'RESET_STATS' });
    startLevel(1);
  };

  const shareResult = async () => {
    const today = getTodayDateString();

    if (gameMode === 'DAILY') {
      const entry = getDailyEntry(today);
      const attempts = entry ? entry.attempts : 1;
      const text = `The Great Sort Daily ${today}\nScore: ${state.levelScore}\nAttempts: ${attempts}`;
      try {
        await navigator.clipboard.writeText(text);
        alert('Result copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
        alert(text);
      }
      return;
    }

    const efficiency = !state.optimalScore ? 0 : Math.min(100, Math.round((state.levelScore / state.optimalScore) * 100));
    const text = `The Great Sort\nScore: ${state.levelScore}\nEfficiency: ${efficiency}%`;

    try {
      await navigator.clipboard.writeText(text);
      alert('Result copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert(text);
    }
  };

  const closeAudit = () => {
    setAuditState(null);
  };

  const triggerCurrentAudit = useCallback(() => {
    const today = getTodayDateString();
    setAuditState({ date: today, userScore: state.levelScore });
    trackDailyAuditViewed(today, 'passed');
  }, [state.levelScore, trackDailyAuditViewed]);

  return {
    state: {
      ...state,
      gameMode,
      auditState,
      resistanceActive,
      selectedTool: state.selectedToolInstanceId,
      // Projected Metrics exposed
      compliancePercentage,
      mood,
      moodColor
    },
    actions: {
      changeMode,
      handleUndo,
      handleToolClick,
      handleCardClick,
      handleBackgroundClick,
      startInspection: loop.startInspection,
      nextLevel,
      retryPractice,
      retryDaily,
      resetGame,
      shareResult,
      closeAudit,
      triggerCurrentAudit,
      triggerResistance,
      closeResistance
    }
  };
}
