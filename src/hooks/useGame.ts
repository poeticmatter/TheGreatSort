import { useEffect, useCallback, useMemo } from 'react';
import { useCoreGame } from './useCoreGame';
import { useMetaGame } from './useMetaGame';
import { useSolverService } from './useSolverService';
import { useProjectedMetrics } from './useProjectedMetrics';
import { useSystemMood } from './useSystemMood';
import { stringToSeed, generateLevel, generateTools, applyMove, generateFlavorMap, gradeLevel } from '../utils/gameLogic';
import { getTodayDateString } from '../utils/dateUtils';
import { GamePhase, GameMode, ToolInstance } from '../../types';
import { PersistenceService } from '../services/persistence';
import { getDailyEntry } from './useGamePersistence';

export function useGame() {

  // 1. Core Game (Board, Reducer, Loop)
  const { state: coreState, dispatch: coreDispatch, actions: coreActions } = useCoreGame();

  // 2. Meta Game (Persistence, Mode, Resistance)
  const { metaState, metaActions } = useMetaGame(coreState, coreDispatch);

  // 3. Solver Service
  const solverState = useSolverService(coreState.currentSeed, metaState.gameMode, coreState.list, coreState.toolsAvailable);

  // 4. Derived Metrics & Mood
  const {
    compliancePercentage,
    startingCompliance,
    isZeroYield,
    yieldRatio,
    currentScore
  } = useProjectedMetrics(coreState.list, coreState.initialList || [], coreState.optimalScore, coreState.worstScore);

  const mood = useSystemMood(compliancePercentage, startingCompliance);

  // --- Orchestration Logic ---

  // Connect Solver to Core
  useEffect(() => {
    if (solverState.optimalScore !== null) {
      coreDispatch({ type: 'SET_OPTIMAL_SCORE', payload: { score: solverState.optimalScore } });
      if (solverState.worstScore !== null) {
        coreDispatch({ type: 'SET_WORST_SCORE', payload: { score: solverState.worstScore } });
      }
    }
  }, [solverState.optimalScore, solverState.worstScore, coreDispatch]);

  // Handle Game Completion (Bridging Core loop -> Meta save)
  // useCoreGame takes an onGameComplete prop? No, I defined `useCoreGame` to take props but I didn't pass them above.
  // I should probably pass the callback or use an effect here.
  // useCoreGame dispatches SET_PHASE RESULTS. We can watch for that.

  const prevPhaseRef = useMemo(() => coreState.phase, [coreState.phase]); // Actually ref is better for comparison
  // But simpler: just use effect on phase change.

  // Hydration & Initialization (The complex part from original useGame)
  useEffect(() => {
    if (metaState.isGameLoaded) return;

    const today = getTodayDateString();

    if (metaState.gameMode === 'DAILY') {
      const seed = stringToSeed(today);

      if (metaState.loadedState) {
        // --- Resume from Save ---
        let currentList = generateLevel(9, seed);
        let currentTools = generateTools(seed);
        let currentFlavorMap = generateFlavorMap(seed);

        // Replay moves
        if (metaState.loadedState.moves) {
          metaState.loadedState.moves.forEach((move: any) => {
            currentList = applyMove(currentList, move.tool, move.index, move.targetIndex);
            const toolIndex = currentTools.findIndex((t: ToolInstance) => t.type === move.tool && !t.used);
            if (toolIndex !== -1) currentTools[toolIndex].used = true;
          });
        }

        // Restore Phase
        let phase = GamePhase.PLANNING;
        if (metaState.loadedState.snapshot?.phase) {
          phase = metaState.loadedState.snapshot.phase;
        }

        // Core Init
        coreActions.initLevel(1, currentList, currentTools, seed, currentFlavorMap, metaState.loadedState.moves);

        if (phase) {
          coreDispatch({ type: 'SET_PHASE', payload: { phase } });
        }

        // Handle Results State restoration
        if (phase === GamePhase.RESULTS) {
          coreDispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: true } });
          const { score, gradedList } = gradeLevel(currentList);
          coreDispatch({ type: 'SET_LIST', payload: { list: gradedList } });
          coreDispatch({ type: 'SET_LEVEL_SCORE', payload: { score: score } });
        } else {
          coreDispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: false } });
        }

      } else if (metaState.dailyResult) {
        // --- Completed but no state ---
        coreDispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: true } });
        coreActions.initLevel(
          1,
          generateLevel(9, seed),
          generateTools(seed),
          seed,
          generateFlavorMap(seed)
        );
        coreDispatch({ type: 'SET_PHASE', payload: { phase: GamePhase.RESULTS } });
        coreDispatch({ type: 'SET_LEVEL_SCORE', payload: { score: metaState.dailyResult.score } });
      } else {
        // --- New Game ---
        startLevel(1, 'DAILY');
      }
    } else {
      startLevel(1, metaState.gameMode);
    }

    metaActions.setIsGameLoaded(true);
  }, [metaState.isGameLoaded, metaState.gameMode, metaState.loadedState, metaState.dailyResult, coreDispatch, coreActions, metaActions]);


  const startLevel = useCallback((lvl: number, modeOverride?: GameMode, seedOverride?: number) => {
    const activeMode = modeOverride || metaState.gameMode;
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
    const flavorMap = generateFlavorMap(seed);

    coreActions.initLevel(lvl, list, tools, seed, flavorMap, []);

    if (seed !== undefined) {
      metaActions.trackGameStart(activeMode, seed);
    }
  }, [metaState.gameMode, coreActions, metaActions]);


  // Zero-Yield Safety Net (Triggering Resistance)
  useEffect(() => {
    const scoresCalculated = coreState.optimalScore !== null && coreState.worstScore !== null;
    const joined = localStorage.getItem('joinedResistance') === 'true';

    if (scoresCalculated && compliancePercentage === 0 && !metaState.resistanceActive && coreState.list.length > 0 && !joined) {
      metaActions.triggerResistance();
    }
  }, [compliancePercentage, coreState.optimalScore, coreState.worstScore, metaState.resistanceActive, coreState.list.length, metaActions]);


  const closeResistanceAndReset = useCallback(() => {
    metaActions.closeResistance();

    // Safety Net Reset Logic
    if (coreState.currentSeed !== undefined) {
      // In PRACTICE, give a new seed to avoid "cursed" levels where start == worst.
      // In DAILY, we must persist the seed.
      const isDaily = metaState.gameMode === 'DAILY';
      const seed = isDaily ? coreState.currentSeed : Math.random() * 1000000;

      const list = generateLevel(9, seed);
      const tools = generateTools(seed);
      coreActions.initLevel(coreState.level, list, tools, seed, generateFlavorMap(seed), []);
      coreDispatch({ type: 'RESET_STATS' });
    }
  }, [metaActions, coreState.currentSeed, coreState.level, coreActions, coreDispatch, metaState.gameMode]);


  const changeMode = useCallback((newMode: GameMode) => {
    metaActions.closeAudit();
    coreActions.stopLoop();

    if (newMode === 'DAILY') {
      const today = getTodayDateString();
      const savedState = PersistenceService.loadDailyState(today);
      const savedResult = PersistenceService.getDailyResult(today);

      if (savedState || savedResult) {
        metaActions.setGameMode('DAILY');
        metaActions.setIsGameLoaded(false); // Trigger re-hydration
        return;
      }
    }

    metaActions.setGameMode(newMode);
    coreDispatch({ type: 'RESET_STATS' });
    coreDispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: false } });

    // Need to defer startLevel? No, simpler to just rely on effect or call it directly?
    // startLevel uses 'metaState.gameMode' which might be stale in this closure if not careful.
    // Better to pass explicit mode
    startLevel(1, newMode);

  }, [metaActions, coreActions, coreDispatch, startLevel]);


  // Core Completion Bridge
  useEffect(() => {
    if (coreState.phase === GamePhase.RESULTS && metaState.gameMode === 'DAILY' && !coreState.dailyCompleted) {
      metaActions.saveDaily();
    }
  }, [coreState.phase, metaState.gameMode, coreState.dailyCompleted, metaActions]);

  // --- Actions ---
  const shareResult = async () => {
    const today = getTodayDateString();
    if (metaState.gameMode === 'DAILY') {
      const entry = getDailyEntry(today);
      const attempts = entry ? entry.attempts : 1;
      const text = `The Great Sort Daily ${today}\nScore: ${coreState.levelScore}\nAttempts: ${attempts}`;
      try { await navigator.clipboard.writeText(text); alert('Result copied to clipboard!'); } catch (err) { alert(text); }
      return;
    }
    const efficiency = !coreState.optimalScore ? 0 : Math.min(100, Math.round((coreState.levelScore / coreState.optimalScore) * 100));
    const text = `The Great Sort\nScore: ${coreState.levelScore}\nEfficiency: ${efficiency}%`;
    try { await navigator.clipboard.writeText(text); alert('Result copied to clipboard!'); } catch (err) { alert(text); }
  };

  return {
    state: {
      ...coreState,
      ...metaState, // Merges gameMode, auditState, resistanceActive/Pending
      selectedTool: coreState.selectedToolInstanceId,
      compliancePercentage,
      mood,
    },
    actions: {
      changeMode,
      handleUndo: coreActions.handleUndo,
      handleToolClick: coreActions.handleToolClick,
      handleCardClick: coreActions.handleCardClick,
      handleBackgroundClick: coreActions.handleBackgroundClick,
      startInspection: coreActions.startInspection,
      nextLevel: () => startLevel(1, 'PRACTICE'),
      retryPractice: () => {
        if (metaState.gameMode === 'PRACTICE' && coreState.currentSeed !== undefined) {
          startLevel(1, 'PRACTICE', coreState.currentSeed);
        }
      },
      retryDaily: () => startLevel(1, 'DAILY'),
      resetGame: () => {
        if (metaState.gameMode === 'DAILY') return;
        coreDispatch({ type: 'RESET_STATS' });
        startLevel(1);
      },
      shareResult,
      closeAudit: metaActions.closeAudit,
      triggerCurrentAudit: metaActions.triggerCurrentAudit,
      triggerResistance: metaActions.triggerResistance,
      closeResistance: closeResistanceAndReset
    }
  };
}
