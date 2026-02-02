import { useEffect, useCallback, useMemo } from 'react';
import { useCoreGame } from './useCoreGame';
import { useMetaGame } from './useMetaGame';
import { useSolverService } from './useSolverService';
import { useProjectedMetrics } from './useProjectedMetrics';
import { useSystemMood } from './useSystemMood';
import { calculateYields, verifyResistanceMission } from '../utils/gameLogic';
import { GameHydrationService } from '../services/gameHydrationService'; // Import Hydration Service
import { useDailyChallenge } from './useDailyChallenge'; // Import Daily Hook
import { PuzzleRepository } from '../services/puzzleRepository'; // Helper usage if needed
import { GamePhase, GameMode, ResistanceStatus } from '../../types';
import { getDailyEntry } from './useGamePersistence'; // For shareResult mostly
import { useGameInteractions } from './useGameInteractions';

export function useGame(sessionDate: string) {

  // 1. Core Game (Board, Reducer, Loop)
  const { state: coreState, dispatch: coreDispatch, actions: coreActions } = useCoreGame();

  // 2. Meta Game (Mode, Audit, Resistance)
  // We passed coreState but useMetaGame no longer persists, so it's safe.
  const { metaState, metaActions } = useMetaGame(coreState, coreDispatch, sessionDate);

  // 3. Daily Logic (Persistence, Locking, Config)
  // This hook manages loading the daily save and creating a config
  const {
    status: dailyStatus,
    initialConfig: dailyConfig,
    dailyResult,
    isLocked,
    saveDailyResult
  } = useDailyChallenge(
    sessionDate,
    coreState,
    metaState.gameMode,
    metaState.isGameLoaded
  );

  // 4. Solver Service
  // Note: Optimal/Worst scores are now set during hydration, so we might not need to sync them back from solver?
  // However, for PRACTICE mode, hydration sets them to null/calc-pending.
  // So we still need useSolverService to potentially calculate them.
  const solverState = useSolverService(
    coreState.currentSeed,
    metaState.gameMode,
    coreState.list,
    coreState.toolsAvailable,
    coreState.optimalScore,
    coreState.worstScore
  );

  // 5. Sync Scores for Practice Mode (or if missing)
  useEffect(() => {
    if (metaState.gameMode === 'PRACTICE') {
      if (solverState.optimalScore !== null && coreState.optimalScore === null) {
        coreDispatch({ type: 'SET_OPTIMAL_SCORE', payload: { score: solverState.optimalScore } });
      }
      if (solverState.worstScore !== null && coreState.worstScore === null) {
        coreDispatch({ type: 'SET_WORST_SCORE', payload: { score: solverState.worstScore } });
      }
    }
  }, [solverState.optimalScore, solverState.worstScore, coreState.optimalScore, coreState.worstScore, coreDispatch, metaState.gameMode]);


  // 6. Derived Metrics & Mood
  const {
    compliancePercentage,
    startingCompliance,
    isZeroYield,
    yieldRatio
  } = useProjectedMetrics(coreState.list, coreState.initialList || [], coreState.optimalScore, coreState.worstScore);

  const mood = useSystemMood(compliancePercentage, startingCompliance, isLocked);


  // --- Initialization & Orchestration ---

  // Handle Initial Load
  useEffect(() => {
    if (metaState.isGameLoaded) return;

    // Daily Mode Initialization
    if (metaState.gameMode === 'DAILY') {
      if (dailyStatus === 'READY' && dailyConfig) {
        if (localStorage.getItem('joinedResistance') === 'true') {
          dailyConfig.resistanceStatus = ResistanceStatus.ACTIVE;
        }
        coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: dailyConfig } });
        metaActions.setIsGameLoaded(true);
        // Ensure scores are set if provided
        if (dailyConfig.optimalScore) coreDispatch({ type: 'SET_OPTIMAL_SCORE', payload: { score: dailyConfig.optimalScore } });
        if (dailyConfig.worstScore) coreDispatch({ type: 'SET_WORST_SCORE', payload: { score: dailyConfig.worstScore } });
        if (dailyConfig.dailyCompleted) coreDispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: true } });
      }
    }
    // Practice Mode Initialization
    else if (metaState.gameMode === 'PRACTICE') {
      // Start fresh practice
      const result = GameHydrationService.hydratePractice();
      coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: result.initialState } });
      metaActions.setIsGameLoaded(true);
      metaActions.trackGameStart('PRACTICE', result.initialState.currentSeed);
    }

  }, [
    metaState.isGameLoaded,
    metaState.gameMode,
    dailyStatus,
    dailyConfig,
    coreDispatch,
    metaActions
  ]);


  // Zero-Yield Safety Net
  useEffect(() => {
    const scoresCalculated = coreState.optimalScore !== null && coreState.worstScore !== null;
    const joined = localStorage.getItem('joinedResistance') === 'true';

    // Guard: Only trigger resistance in DAILY mode
    if (metaState.gameMode === 'DAILY' && scoresCalculated && compliancePercentage === 0 && !metaState.resistanceActive && coreState.list.length > 0 && !joined) {
      if (localStorage.getItem('joinedResistance') !== 'true') {
        metaActions.triggerResistance();
        coreDispatch({ type: 'ACTIVATE_RESISTANCE' });
      }
    }
  }, [compliancePercentage, coreState.optimalScore, coreState.worstScore, metaState.resistanceActive, coreState.list.length, metaActions, metaState.gameMode, coreDispatch]);


  // --- Actions ---

  const handleSaveDaily = useCallback(() => {
    // Determine Final Resistance Status
    let finalStatus = coreState.resistanceStatus;

    if (coreState.resistanceStatus !== ResistanceStatus.INACTIVE) {
      // Fetch Targets to Validate Success/Failure
      const [y, m, d] = sessionDate.split('-').map(Number);
      const puzzleDate = new Date(y, m - 1, d);
      const puzzle = PuzzleRepository.getDailyPuzzle(puzzleDate);

      // Calculate Initial True Yield (for floor)
      const initialTrueYield = calculateYields(coreState.initialList).trueYield;
      const maxTrueYield = puzzle.resistanceData?.trueYieldTarget || 0;

      // Verify
      finalStatus = verifyResistanceMission(
        coreState.list,
        coreState.resistanceStatus,
        coreState.list.length,
        initialTrueYield,
        maxTrueYield
      );
    }

    // Composite action: Save Persist + Meta Update
    saveDailyResult(coreState.levelScore, finalStatus);
    coreDispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: true } });
    metaActions.setResistancePending(true);
    metaActions.trackGameComplete('DAILY', coreState.levelScore, coreState.optimalScore);
  }, [saveDailyResult, coreState.levelScore, coreState.resistanceStatus, coreState.optimalScore, coreDispatch, metaActions, sessionDate, coreState.list, coreState.initialList]);

  const changeMode = useCallback((newMode: GameMode) => {
    metaActions.closeAudit();
    coreActions.stopLoop();
    metaActions.setGameMode(newMode);
    // Setting loaded to false triggers the Initialization Effect above
    metaActions.setIsGameLoaded(false);
    coreDispatch({ type: 'RESET_STATS' }); // Cleaner reset
  }, [metaActions, coreActions, coreDispatch]);

  const retryDaily = useCallback(() => {
    const [y, m, d] = sessionDate.split('-').map(Number);
    const puzzleDate = new Date(y, m - 1, d);
    const puzzle = PuzzleRepository.getDailyPuzzle(puzzleDate);

    // 1. Get fresh standard state
    const { initialState } = GameHydrationService.hydrateDailyNew(puzzle);

    // 2. [CRITICAL] Inject Resistance Status if player has joined
    const hasJoined = localStorage.getItem('joinedResistance') === 'true';
    if (hasJoined) {
      initialState.resistanceStatus = ResistanceStatus.ACTIVE;
    }

    // 3. Dispatch initialization
    coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: initialState } });
    coreDispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: false } });

  }, [sessionDate, coreDispatch]);

  const retryPractice = useCallback(() => {
    if (metaState.gameMode === 'PRACTICE' && coreState.currentSeed !== undefined) {
      // Replay same seed
      const { initialState } = GameHydrationService.hydratePractice(coreState.currentSeed);
      coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: initialState } });
    } else {
      changeMode('PRACTICE');
    }
  }, [metaState.gameMode, coreState.currentSeed, coreDispatch, changeMode]);

  const nextLevel = useCallback(() => {
    // New Practice Seed
    const { initialState } = GameHydrationService.hydratePractice();
    coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: initialState } });
    metaActions.trackGameStart('PRACTICE', initialState.currentSeed);
  }, [coreDispatch, metaActions]);

  const closeResistanceAndReset = useCallback(() => {
    // 1. Commit the player to the resistance
    localStorage.setItem('joinedResistance', 'true');

    // 2. Close the UI overlay
    metaActions.closeResistance();

    // 3. Restart the level with the new status
    if (metaState.gameMode === 'DAILY') {
      retryDaily();
    } else {
      nextLevel();
    }
  }, [metaActions, metaState.gameMode, retryDaily, nextLevel]);

  const shareResult = async () => {
    // ... Keep existing logic or refactor ...
    // existing logic used getDailyEntry.
    if (metaState.gameMode === 'DAILY') {
      const entry = getDailyEntry(sessionDate);
      const attempts = entry ? entry.attempts : 1;
      const text = `The Great Sort Daily ${sessionDate}\nScore: ${coreState.levelScore}\nAttempts: ${attempts}`;
      try { await navigator.clipboard.writeText(text); alert('Result copied to clipboard!'); } catch (err) { alert(text); }
      return;
    }
    const efficiency = !coreState.optimalScore ? 0 : Math.min(100, Math.round((coreState.levelScore / coreState.optimalScore) * 100));
    const text = `The Great Sort\nScore: ${coreState.levelScore}\nEfficiency: ${efficiency}%`;
    try { await navigator.clipboard.writeText(text); alert('Result copied to clipboard!'); } catch (err) { alert(text); }
  };

  // ... (keep previous code until return)

  // 7. Interaction Layer
  // Composite state for the Interaction Hook (Logic only)
  const compositeState = {
    ...coreState,
    ...metaState,
    mood,
    compliancePercentage,
    optimalScore: coreState.optimalScore,
    levelScore: coreState.levelScore,
    movesHistory: coreState.movesHistory,
    isLocked: metaState.gameMode === 'PRACTICE' ? false : isLocked
  };

  // Memoize actions passed to the interaction hook to prevent it from re-running unnecessarily
  const gameActions = useMemo(() => ({
    ...coreActions,
    ...metaActions,
    changeMode,
    nextLevel,
    retryDaily,
    retryPractice,
    saveDaily: handleSaveDaily,
    startInspection: coreActions.startInspection,
    triggerCurrentAudit: metaActions.triggerCurrentAudit
  }), [
    coreActions,
    metaActions,
    changeMode,
    nextLevel,
    retryDaily,
    retryPractice,
    handleSaveDaily
  ]);

  const interaction = useGameInteractions(compositeState, gameActions);

  // Memoize the returned actions object
  const finalActions = useMemo(() => ({
    changeMode,
    handleUndo: coreActions.handleUndo,
    handleToolClick: coreActions.handleToolClick,
    handleCardClick: coreActions.handleCardClick,
    handleBackgroundClick: coreActions.handleBackgroundClick,
    startInspection: coreActions.startInspection,
    nextLevel,
    retryPractice,
    retryDaily,
    resetGame: () => {
      if (metaState.gameMode === 'DAILY') retryDaily();
      else retryPractice();
    },
    shareResult,
    closeAudit: metaActions.closeAudit,
    triggerCurrentAudit: metaActions.triggerCurrentAudit,
    triggerResistance: metaActions.triggerResistance,
    closeResistance: closeResistanceAndReset,
    saveDaily: handleSaveDaily
  }), [
    changeMode,
    coreActions,
    nextLevel,
    retryPractice,
    retryDaily,
    metaState.gameMode,
    shareResult,
    metaActions,
    closeResistanceAndReset,
    handleSaveDaily
  ]);

  return {
    // Pure Data for Rendering (The "Model")
    data: {
      ...coreState,
      ...metaState,
      // Derived Metrics
      compliancePercentage,
      mood,
      sessionDate,
      dailyResult,
      isLocked: metaState.gameMode === 'PRACTICE' ? false : isLocked,
      resistanceActive: metaState.gameMode === 'PRACTICE' ? false : metaState.resistanceActive,
      persistenceLoaded: dailyStatus === 'READY',
      startingCompliance,
      isZeroYield,
      yieldRatio,
      // Alias for convenience if needed, though idiomatic to use data.toolsAvailable etc.
      selectedTool: coreState.selectedToolInstanceId,
      // Calculate Yields on the fly for UI (Resistance Mode)
      // visibleYield = sum of survivor vals, trueYield = sum of survivor trueValues
      ...(coreState.resistanceStatus !== ResistanceStatus.INACTIVE
        ? calculateYields(coreState.list)
        : { visibleYield: 0, trueYield: 0 })
    },
    // UI Logic (The "ViewModel")
    interaction,
    // Event Handlers (The "Controller")
    actions: finalActions
  };
}
