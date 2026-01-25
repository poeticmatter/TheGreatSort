import { useState, useEffect, useCallback } from 'react';
import { GameMode, GamePhase, ToolInstance, CardItem } from '../../types';
import { lengthFromLevel, stringToSeed, generateLevel, generateTools, findOptimalScore, findWorstScore, applyMove } from '../utils/gameLogic';
import { getTodayDateString, getYesterdayDateString } from '../utils/dateUtils';
import { gradeLevel } from '../utils/gameLogic';
import { useGameContext } from '../context/GameContext';
import { useGamePersistence, loadCareerTools, saveCareerTools, saveDailyScore, getDailyEntry, markDailyAuditSeen } from './useGamePersistence';
import { useGameLoop } from './useGameLoop';

export function useGame() {
  const { state, dispatch } = useGameContext();
  const [gameMode, setGameMode] = useState<GameMode>('DAILY');
  const [isGameLoaded, setIsGameLoaded] = useState(false);
  const [auditState, setAuditState] = useState<{ date: string, userScore: number } | null>(null);
  const [resistanceActive, setResistanceActive] = useState(false);

  // --- Handlers (Pass-Through) ---

  const handleToolClick = (toolInstanceId: string) => {
    dispatch({ type: 'INTERACT_TOOL', payload: { toolInstanceId } });
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

    if (activeMode === 'CAREER') {
      len = lengthFromLevel(lvl);
      seed = undefined;

      if (lvl === 1) {
          tools = generateTools();
          saveCareerTools(tools);
      } else {
          const savedTools = loadCareerTools();
          if (savedTools) {
              tools = savedTools;
              tools = tools.map(t => ({ ...t, used: false }));
          } else {
              tools = generateTools();
              saveCareerTools(tools);
          }
      }

    } else if (activeMode === 'DAILY') {
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

  useEffect(() => {
    if (gameMode === 'DAILY') return;
    if (state.list.length > 0 && state.phase === GamePhase.PLANNING && state.optimalScore === null) {
      const timer = setTimeout(() => {
        const best = findOptimalScore(state.list, state.toolsAvailable);
        dispatch({ type: 'SET_OPTIMAL_SCORE', payload: { score: best } });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state.list, state.phase, state.optimalScore, state.toolsAvailable, gameMode, dispatch]);

  useEffect(() => {
    if (gameMode === 'DAILY' && state.phase === GamePhase.RESULTS && state.currentSeed !== undefined && state.optimalScore === null) {
       const seed = state.currentSeed;
       const initialList = generateLevel(9, seed);
       const initialTools = generateTools(seed);

       const timer = setTimeout(() => {
           const best = findOptimalScore(initialList, initialTools);
           const worst = findWorstScore(initialList, initialTools);

           dispatch({ type: 'SET_OPTIMAL_SCORE', payload: { score: best } });
           dispatch({ type: 'SET_WORST_SCORE', payload: { score: worst } });
       }, 100);

       return () => clearTimeout(timer);
    }
  }, [gameMode, state.phase, state.currentSeed, state.optimalScore, dispatch]);

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
      if (gameMode === 'CAREER') {
          startLevel(state.level + 1);
      } else if (gameMode === 'PRACTICE') {
          startLevel(1, 'PRACTICE');
      }
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
      handleToolClick,
      handleCardClick,
      handleBackgroundClick,
      startInspection: loop.startInspection,
      nextLevel,
      retryPractice,
      retryDaily,
      resetGame,
      shareResult,
      toggleMusic: () => {}, 
      openAudit,
      closeAudit,
      triggerResistance,
      closeResistance
    }
  };
}
