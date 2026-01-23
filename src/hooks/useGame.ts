import { useState, useEffect, useCallback } from 'react';
import { GameMode, GamePhase, ToolInstance, CardItem } from '../../types';
import { lengthFromLevel, stringToSeed, generateLevel, generateTools, findOptimalScore, findWorstScore, DailyState, applyMove } from '../utils/gameLogic';
import { getTodayDateString, getYesterdayDateString } from '../utils/dateUtils';
import { gradeLevel } from '../utils/gameLogic';
import { useGameEngine } from './useGameEngine';
import { useGamePersistence, loadCareerTools, saveCareerTools, saveDailyScore, getDailyEntry, DailyEntry } from './useGamePersistence';
import { useGameLoop } from './useGameLoop';

export function useGame() {
  const [gameMode, setGameMode] = useState<GameMode>('DAILY');
  const [isGameLoaded, setIsGameLoaded] = useState(false);
  const [auditState, setAuditState] = useState<{ date: string, userScore: number } | null>(null);
  const [resistanceActive, setResistanceActive] = useState(false);

  // --- Engine ---
  const handleMoveCommitted = useCallback(() => {
    localStorage.setItem('hasUsedAction', 'true');
  }, []);

  const engine = useGameEngine(handleMoveCommitted);

  // --- Persistence ---
  const persistenceState = {
      movesHistory: engine.state.movesHistory,
      phase: engine.state.phase,
      toolsAvailable: engine.state.toolsAvailable,
      levelScore: engine.state.levelScore,
      optimalScore: engine.state.optimalScore,
      worstScore: engine.state.worstScore,
      list: engine.state.list
  };

  const { loadedState, dailyResult } = useGamePersistence(gameMode, persistenceState, isGameLoaded);

  // --- Loop Callback ---
  const handleGameCompletion = useCallback(() => {
      // Logic from legacy hook (saveScore)
      if (gameMode === 'DAILY') {
          saveDailyScore(getTodayDateString(), engine.state.levelScore);
          engine.actions.setDailyCompleted(true);
      }
      engine.actions.setPhase(GamePhase.RESULTS);
  }, [gameMode, engine.state.levelScore, engine.actions]);

  // --- Loop ---
  const loop = useGameLoop(engine, handleGameCompletion);

  // --- Hydration & Initialization ---
  useEffect(() => {
    if (isGameLoaded) return;

    const today = getTodayDateString();

    // Check for Yesterday's Audit on Load
    const yesterday = getYesterdayDateString();
    const entry = getDailyEntry(yesterday);
    if (entry) {
        setAuditState({ date: entry.date, userScore: entry.highScore });
    }

    // Restore Daily State if available
    if (gameMode === 'DAILY') {
        const savedStateStr = localStorage.getItem(`daily_state_${today}`);
        const savedResultStr = localStorage.getItem(`daily_result_${today}`);
        const directLoadedState = savedStateStr ? JSON.parse(savedStateStr) : null;
        const directDailyResult = savedResultStr ? JSON.parse(savedResultStr) : null;

        if (directLoadedState) {
            // Restore
            const seed = stringToSeed(today);
            let currentList = generateLevel(9, seed);
            let currentTools = directLoadedState.tools;
            if (!currentTools) {
              currentTools = generateTools(seed);
            } else {
              // Reset usage state to prevent double-counting during replay
              currentTools = currentTools.map((t: ToolInstance) => ({ ...t, used: false }));
            }

            // Replay
            directLoadedState.moves.forEach((move: any) => {
                currentList = applyMove(currentList, move.tool, move.index, move.targetIndex);
                // Mark tools used
                const toolIndex = currentTools.findIndex((t: ToolInstance) => t.type === move.tool && !t.used);
                if (toolIndex !== -1) currentTools[toolIndex].used = true;
            });

            // Load into Engine
            engine.actions.loadState({
                level: 1,
                currentSeed: seed,
                toolsAvailable: currentTools,
                movesHistory: directLoadedState.moves,
                phase: directLoadedState.phase,
                list: currentList
            });

            if (directLoadedState.phase === GamePhase.RESULTS) {
                engine.actions.setDailyCompleted(true);
                const { score, gradedList } = gradeLevel(currentList);
                engine.actions.setList(gradedList);
                engine.actions.setLevelScore(score);

                // Note: removed engine.actions.setOptimalScore(dailyResult.optimal) per instruction
            } else {
                engine.actions.setList(currentList);
                engine.actions.setDailyCompleted(false);
            }

        } else if (directDailyResult) {
             // Daily completed but state missing (legacy/cleared)
             engine.actions.setDailyCompleted(true);
             engine.actions.setLevelScore(directDailyResult.score);
             // Note: removed engine.actions.setOptimalScore(dailyResult.optimal) per instruction
             engine.actions.setPhase(GamePhase.RESULTS);
             engine.actions.startLevel(1, generateLevel(9, stringToSeed(today)), generateTools(stringToSeed(today)), stringToSeed(today));
             engine.actions.setPhase(GamePhase.RESULTS); // Force phase back to results after startLevel resets it
        } else {
             // New Daily Game
             startLevel(1, 'DAILY');
        }
    } else {
        // Other modes (shouldn't happen on init default, but safe)
        startLevel(1, gameMode);
    }

    setIsGameLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameLoaded, gameMode]);

  // --- Helper: Start Level Logic ---
  const startLevel = (lvl: number, modeOverride?: GameMode, seedOverride?: number) => {
    const activeMode = modeOverride || gameMode;

    // Logic from original startLevel
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

    // Generate List
    const list = generateLevel(len, seed);

    engine.actions.startLevel(lvl, list, tools, seed);
  };

  // --- Effects ---

  // Optimal Score Calculation
  useEffect(() => {
    // Disable Solver for Daily
    if (gameMode === 'DAILY') return;

    if (engine.state.list.length > 0 && engine.state.phase === GamePhase.PLANNING && engine.state.optimalScore === null) {
      const timer = setTimeout(() => {
        const best = findOptimalScore(engine.state.list, engine.state.toolsAvailable);
        engine.actions.setOptimalScore(best);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [engine.state.list, engine.state.phase, engine.state.optimalScore, engine.state.toolsAvailable, gameMode]);

  // Update Total Score on Results
  useEffect(() => {
      if (engine.state.phase === GamePhase.RESULTS) {
          engine.actions.setTotalScore(prev => prev + engine.state.levelScore);
          engine.actions.setTotalOptimalScore(prev => prev + (engine.state.optimalScore || 0));
      }
  }, [engine.state.phase, engine.state.levelScore, engine.state.optimalScore]);

  // Calculate Scores for Daily Mode on Results
  useEffect(() => {
    if (gameMode === 'DAILY' && engine.state.phase === GamePhase.RESULTS && engine.state.currentSeed !== undefined && engine.state.optimalScore === null) {
       // Regenerate initial state to calculate benchmarks
       const seed = engine.state.currentSeed;
       const initialList = generateLevel(9, seed);
       const initialTools = generateTools(seed);

       const timer = setTimeout(() => {
           const best = findOptimalScore(initialList, initialTools);
           const worst = findWorstScore(initialList, initialTools);

           engine.actions.setOptimalScore(best);
           engine.actions.setWorstScore(worst);
       }, 100);

       return () => clearTimeout(timer);
    }
  }, [gameMode, engine.state.phase, engine.state.currentSeed, engine.state.optimalScore]);


  // --- Actions Wiring ---

  const changeMode = (newMode: GameMode) => {
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
        engine.actions.resetStats();
        engine.actions.setDailyCompleted(false);
        startLevel(1, 'DAILY');
    } else {
        setGameMode(newMode);
        engine.actions.resetStats();
        engine.actions.setDailyCompleted(false);
        startLevel(1, newMode);
    }
  };

  const nextLevel = () => {
      if (gameMode === 'CAREER') {
          startLevel(engine.state.level + 1);
      } else if (gameMode === 'PRACTICE') {
          startLevel(1, 'PRACTICE');
      }
  };

  const retryPractice = () => {
      if (gameMode === 'PRACTICE' && engine.state.currentSeed !== undefined) {
          startLevel(1, 'PRACTICE', engine.state.currentSeed);
      }
  };

  const retryDaily = () => {
      startLevel(1, 'DAILY');
  };

  const resetGame = () => {
      if (gameMode === 'DAILY') return;
      engine.actions.resetStats();
      startLevel(1);
  };

  const shareResult = async () => {
    const today = getTodayDateString();

    if (gameMode === 'DAILY') {
        const entry = getDailyEntry(today);
        const attempts = entry ? entry.attempts : 1;
        const text = `The Great Sort Daily ${today}\nScore: ${engine.state.levelScore}\nAttempts: ${attempts}`;
        try {
          await navigator.clipboard.writeText(text);
          alert('Result copied to clipboard!');
        } catch (err) {
          console.error('Failed to copy:', err);
          alert(text);
        }
        return;
    }

    const efficiency = !engine.state.optimalScore ? 0 : Math.min(100, Math.round((engine.state.levelScore / engine.state.optimalScore) * 100));
    const text = `The Great Sort\nScore: ${engine.state.levelScore}\nEfficiency: ${efficiency}%`;

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
      setAuditState(null);
  };

  const triggerResistance = useCallback(() => {
      setResistanceActive(true);
      setAuditState(null);
  }, []);

  const closeResistance = useCallback(() => {
      setResistanceActive(false);
  }, []);

  const handleCardClick = (item: CardItem) => {
      const index = engine.state.list.findIndex(i => i.id === item.id);
      if (index === -1) return;
      engine.actions.handleCardClick(index);
  }

  return {
    state: {
      ...engine.state,
      gameMode,
      auditState,
      resistanceActive,
      // Overwrite selectedTool to match original interface (string | null)
      selectedTool: engine.state.selectedToolInstanceId,
    },
    actions: {
      changeMode,
      handleToolClick: engine.actions.handleToolClick,
      handleCardClick,
      handleBackgroundClick: engine.actions.handleBackgroundClick,
      startInspection: loop.startInspection,
      nextLevel,
      retryPractice,
      retryDaily,
      resetGame,
      shareResult,
      toggleMusic: () => {}, // Handled in App
      openAudit,
      closeAudit,
      triggerResistance,
      closeResistance
    }
  };
}
