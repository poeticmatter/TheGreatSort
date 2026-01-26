import { useState, useEffect, useCallback, useRef } from 'react';
import { GameMode, GamePhase, ToolInstance, CardItem } from '../../types';
import { stringToSeed, generateLevel, generateTools, findOptimalScore, findWorstScore, applyMove, calculateRelativeEfficiency } from '../utils/gameLogic';
import { getTodayDateString, getYesterdayDateString } from '../utils/dateUtils';
import { gradeLevel } from '../utils/gameLogic';
import { useGameContext } from '../context/GameContext';
import { useGamePersistence, saveDailyScore, getDailyEntry, markDailyAuditSeen } from './useGamePersistence';
import { useGameLoop } from './useGameLoop';

export function useGame() {
  const { state, dispatch } = useGameContext();
  const [gameMode, setGameMode] = useState<GameMode>('DAILY');
  const [isGameLoaded, setIsGameLoaded] = useState(false);
  const [auditState, setAuditState] = useState<{ date: string, userScore: number } | null>(null);

  const [resistanceActive, setResistanceActive] = useState(false);
  const [resistancePending, setResistancePending] = useState(false);

  // --- Handlers (Pass-Through) ---

  const handleToolClick = (toolInstanceId: string) => {
    dispatch({ type: 'INTERACT_TOOL', payload: { toolInstanceId } });
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
  // The reducer is pure, so we track side-effects in the hook reacting to state changes.
  useEffect(() => {
     if (state.movesHistory.length > 0) {
         // Optimization: Only set if not set, or blindly set. 
         // Since this effect runs on every move, straightforward setting is fine.
         localStorage.setItem('hasUsedAction', 'true');
     }
  }, [state.movesHistory]);


  // --- Persistence ---
  const persistenceState = {
      movesHistory: state.movesHistory,
      phase: state.phase,
      toolsAvailable: state.toolsAvailable,
      levelScore: state.levelScore,
      optimalScore: state.optimalScore,
      worstScore: state.worstScore || null,
      list: state.list
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
  }, [gameMode, state.levelScore, dispatch, state.totalScore, state.totalOptimalScore, state.optimalScore]);

  // --- Loop ---
  // Note: useGameLoop logic remains the same (Inspection Logic)
  const loop = useGameLoop(state.list, dispatch, handleGameCompletion);

  // --- Hydration & Initialization ---
  useEffect(() => {
    if (isGameLoaded) return;

    const today = getTodayDateString();

    const yesterday = getYesterdayDateString();
    const entry = getDailyEntry(yesterday);
    if (entry && !entry.auditSeen) {
        setAuditState({ date: entry.date, userScore: entry.highScore });
    }

    if (gameMode === 'DAILY') {
        const savedStateStr = localStorage.getItem(`daily_state_${today}`);
        const savedResultStr = localStorage.getItem(`daily_result_${today}`);
        const directLoadedState = savedStateStr ? JSON.parse(savedStateStr) : null;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const directDailyResult = savedResultStr ? JSON.parse(savedResultStr) : null;

        if (directLoadedState) {
            const seed = stringToSeed(today);
            let currentList = generateLevel(9, seed);
            let currentTools = directLoadedState.tools;
            if (!currentTools) {
              currentTools = generateTools(seed);
            } else {
              currentTools = currentTools.map((t: ToolInstance) => ({ ...t, used: false }));
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            directLoadedState.moves.forEach((move: any) => {
                currentList = applyMove(currentList, move.tool, move.index, move.targetIndex);
                const toolIndex = currentTools.findIndex((t: ToolInstance) => t.type === move.tool && !t.used);
                if (toolIndex !== -1) currentTools[toolIndex].used = true;
            });

            dispatch({
                type: 'START_LEVEL',
                payload: {
                    level: 1,
                    list: currentList,
                    tools: currentTools,
                    seed: seed,
                    movesHistory: directLoadedState.moves
                }
            });
            
            if (directLoadedState.phase) {
                 dispatch({ type: 'SET_PHASE', payload: { phase: directLoadedState.phase } });
            }

            if (directLoadedState.phase === GamePhase.RESULTS) {
                dispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: true } });
                const { score, gradedList } = gradeLevel(currentList);
                dispatch({ type: 'SET_LIST', payload: { list: gradedList } });
                dispatch({ type: 'SET_LEVEL_SCORE', payload: { score: score } });
            } else {
                 dispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: false } });
                 dispatch({ type: 'SET_LIST', payload: { list: currentList } });
            }

        } else if (directDailyResult) {
             dispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: true } });
             dispatch({
                 type: 'START_LEVEL',
                 payload: {
                     level: 1,
                     list: generateLevel(9, stringToSeed(today)),
                     tools: generateTools(stringToSeed(today)),
                     seed: stringToSeed(today)
                 }
             });
             dispatch({ type: 'SET_PHASE', payload: { phase: GamePhase.RESULTS } });
             dispatch({ type: 'SET_LEVEL_SCORE', payload: { score: directDailyResult.score } });
        } else {
             startLevel(1, 'DAILY');
        }
    } else {
        startLevel(1, gameMode);
    }

    setIsGameLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameLoaded, gameMode, dispatch]);

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
  };

  const triggerResistance = useCallback(() => {
      setResistanceActive(true);
      setAuditState(null);
  }, []);

  const closeResistance = useCallback(() => {
      setResistanceActive(false);
  }, []);

  // --- Effects ---

  // --- Worker Integration ---
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Worker
    workerRef.current = new Worker(new URL('../workers/gameSolver.worker.ts', import.meta.url), { type: 'module' });

    // Handle messages
    workerRef.current.onmessage = (e) => {
      const { id, optimalScore, worstScore } = e.data;
      
      // Prevent Race Conditions:
      // Ensure the result matches the current level's seed.
      // If seed is undefined (Career), we fall back to checking if the score is still needed (null).
      // Ideally we want to match the seed exactly.
      if (id === state.currentSeed) {
           dispatch({ type: 'SET_OPTIMAL_SCORE', payload: { score: optimalScore } });
           if (worstScore !== undefined) {
               dispatch({ type: 'SET_WORST_SCORE', payload: { score: worstScore } });
           }

           // Cache solution
           if (id !== undefined && gameMode === 'DAILY') {
              const cacheKey = `tgs_solution_${id}`;
              localStorage.setItem(cacheKey, JSON.stringify({ optimalScore, worstScore }));
           }
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [dispatch, state.currentSeed, gameMode]); // Re-binding listener if seed changes isn't needed, but dispatch might change. Actually we can keep the worker stable.

  // --- Resistance Check ---
  useEffect(() => {
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
            // Delay for dramatic effect (800ms-1000ms)
            const timer = setTimeout(() => {
                setResistanceActive(true);
                setResistancePending(false);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setResistancePending(false);
        }
    }
  }, [gameMode, state.phase, state.optimalScore, state.worstScore, state.levelScore, resistancePending]);

  // Trigger Calculation
  useEffect(() => {
    // Only calculate if we haven't already and we are in a valid state
    // We prioritize using currentSeed as the ID.
    if (state.list.length > 0 && state.optimalScore === null && workerRef.current) {
        
        // Cache Check
        if (state.currentSeed !== undefined && gameMode === 'DAILY') {
            const cacheKey = `tgs_solution_${state.currentSeed}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const { optimalScore, worstScore } = JSON.parse(cached);
                    dispatch({ type: 'SET_OPTIMAL_SCORE', payload: { score: optimalScore } });
                    if (worstScore !== undefined) {
                        dispatch({ type: 'SET_WORST_SCORE', payload: { score: worstScore } });
                    }
                    return; // Skip calculation
                } catch (e) {
                   console.error("Failed to parse cached solution", e);
                }
            }
        }

        // Determine mode
        const mode = (gameMode === 'DAILY' || gameMode === 'RESULTS') ? 'BOTH' : 'OPTIMAL';
        
        let listToSolve = state.list;
        let toolsToSolve = state.toolsAvailable;

        // CRITICAL FIX: Ensure we solve for the INITIAL state, not the current (potentially in-progress) state.
        // In DAILY mode, we might have hydrated a state where moves are already made.
        // We must regenerate the fresh level/tools from the seed.
        if (state.currentSeed !== undefined) {
             // For Daily and Practice, length is always 9.
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
    if (auditState) {
        markDailyAuditSeen(auditState.date);
    }
    setAuditState(null);
    loop.stopLoop();

    if (newMode === 'DAILY') {
        const today = getTodayDateString();
        const savedStateStr = localStorage.getItem(`daily_state_${today}`);
        const savedResultStr = localStorage.getItem(`daily_result_${today}`);

        if (savedStateStr || savedResultStr) {
             setGameMode('DAILY');
             setIsGameLoaded(false);
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

  const openAudit = () => {
      const yesterday = getYesterdayDateString();
      const entry = getDailyEntry(yesterday);
      if (entry) {
          setAuditState({ date: entry.date, userScore: entry.highScore });
      }
  };

  const closeAudit = () => {
      if (auditState) {
          markDailyAuditSeen(auditState.date);
      }
      setAuditState(null);
  };

  const triggerCurrentAudit = useCallback(() => {
    const today = getTodayDateString();
    markDailyAuditSeen(today);
    setAuditState({ date: today, userScore: state.levelScore });
  }, [state.levelScore]);

  return {
    state: {
      ...state,
      gameMode,
      auditState,
      resistanceActive,
      selectedTool: state.selectedToolInstanceId,
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
 
      openAudit,
      closeAudit,
      triggerCurrentAudit,
      triggerResistance,
      closeResistance
    }
  };
}
