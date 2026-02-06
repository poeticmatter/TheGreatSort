import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useCoreGame } from './useCoreGame';
import { useMetaGame } from './useMetaGame';
import { useSolverService } from './useSolverService';
import { useProjectedMetrics } from './useProjectedMetrics';
import { useSystemMood } from './useSystemMood';
import { verifyResistanceMission, gradeLevel } from '../utils/gameLogic';
import { GameHydrationService } from '../services/gameHydrationService'; // Import Hydration Service
import { useDailyChallenge } from './useDailyChallenge'; // Import Daily Hook
import { PuzzleRepository } from '../services/puzzleRepository'; // Helper usage if needed
import { GamePhase, GameMode, ResistanceStatus, CardItem, Move } from '../../types';
import { getDailyEntry } from './useGamePersistence'; // For shareResult mostly
import { useGameInteractions } from './useGameInteractions';
import { useResistanceSystem } from './useResistanceSystem';
import { PersistenceService } from '../services/persistence';
import { initialResistanceState } from '../reducers/resistanceReducer';

export function useGame(sessionDate: string) {

  // 1. Core Game (Board, Reducer, Loop)

  const { state: coreState, dispatch: coreDispatch, actions: coreActions } = useCoreGame();

  // 2. Meta Game (Mode, Audit, Resistance)
  const { metaState, metaActions } = useMetaGame(coreState, coreDispatch, sessionDate);

  // 3. Daily Logic
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
  const solverState = useSolverService(
    coreState.currentSeed,
    metaState.gameMode,
    coreState.list,
    coreState.toolsAvailable,
    coreState.optimalScore,
    coreState.worstScore,
    coreDispatch
  );

  // 5. Sync Scores - Handled inside useSolverService now.


  // 6. Derived Metrics & Mood
  const targetScoreForMetrics = coreState.optimalScore;

  const {
    currentYield,
    compliancePercentage,
    startingCompliance,
    isZeroYield,
    yieldRatio,
    projectedResistanceStatus: projectResistanceStatus
  } = useProjectedMetrics(
    coreState.list,
    coreState.initialList || [],
    targetScoreForMetrics,
    coreState.worstScore,
    coreState.resistance?.targetYield
  );

  const mood = useSystemMood(compliancePercentage, startingCompliance, isLocked);

  // --- Actions Definition for Resistance System ---

  const changeMode = useCallback((newMode: GameMode) => {
    metaActions.closeAudit();
    coreActions.stopLoop();
    metaActions.setGameMode(newMode);
    metaActions.setIsGameLoaded(false);
    coreDispatch({ type: 'RESET_STATS' });
  }, [metaActions, coreActions, coreDispatch]);

  const retryDaily = useCallback(() => {
    const [y, m, d] = sessionDate.split('-').map(Number);
    const puzzleDate = new Date(y, m - 1, d);
    const puzzle = PuzzleRepository.getDailyPuzzle(puzzleDate);
    const { initialState } = GameHydrationService.hydrateDailyNew(puzzle); // 2. [CRITICAL] Inject Resistance Status if player has joined
    const hasJoined = PersistenceService.loadResistanceStatus();
    if (hasJoined) {
      initialState.resistance = { ...initialResistanceState, status: ResistanceStatus.ACTIVE };
    }
    coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: initialState } });
    coreDispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: false } });
  }, [sessionDate, coreDispatch]);

  const nextLevel = useCallback(() => {
    const { initialState } = GameHydrationService.hydratePractice();
    coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: initialState } });
    metaActions.trackGameStart('PRACTICE', initialState.currentSeed);
  }, [coreDispatch, metaActions]);

  // --- Resistance System ---
  const hasJoinedResistance = PersistenceService.loadResistanceStatus();

  const { finalizeResistanceMission, closeResistanceAndReset, checkResistanceTrigger } = useResistanceSystem({
    coreState,
    coreDispatch,
    metaState,
    metaActions,
    saveDailyResult,
    retryDaily,
    nextLevel,
    hasJoinedResistance
  });



  // --- Initialization ---

  useEffect(() => {
    if (metaState.isGameLoaded) return;

    if (metaState.gameMode === 'DAILY') {
      if (dailyStatus === 'READY' && dailyConfig) {
        if (PersistenceService.loadResistanceStatus()) {
          dailyConfig.resistance = { ...initialResistanceState, status: ResistanceStatus.ACTIVE };
        }
        coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: dailyConfig } });
        metaActions.setIsGameLoaded(true);
        if (dailyConfig.optimalScore) coreDispatch({ type: 'SET_OPTIMAL_SCORE', payload: { score: dailyConfig.optimalScore } });
        if (dailyConfig.worstScore) coreDispatch({ type: 'SET_WORST_SCORE', payload: { score: dailyConfig.worstScore } });
        if (dailyConfig.dailyCompleted) coreDispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: true } });
      }
    }
    else if (metaState.gameMode === 'PRACTICE') {
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


  // --- Actions ---

  const retryPractice = useCallback(() => {
    if (metaState.gameMode === 'PRACTICE' && coreState.currentSeed !== undefined) {
      const { initialState } = GameHydrationService.hydratePractice(coreState.currentSeed);
      coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: initialState } });
    } else {
      changeMode('PRACTICE');
    }
  }, [metaState.gameMode, coreState.currentSeed, coreDispatch, changeMode]);


  const shareResult = async () => {
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
    saveDaily: finalizeResistanceMission,
    startInspection: coreActions.startInspection,
    triggerCurrentAudit: metaActions.triggerCurrentAudit
  }), [
    coreActions,
    metaActions,
    changeMode,
    nextLevel,
    retryDaily,
    retryPractice,
    finalizeResistanceMission
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
    triggerResistance: () => coreDispatch({ type: 'ACTIVATE_RESISTANCE' }),
    closeResistance: closeResistanceAndReset,
    saveDaily: finalizeResistanceMission
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
    finalizeResistanceMission
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
      resistanceActive: metaState.gameMode === 'PRACTICE' ? false : (coreState.resistance?.isViewOpen ?? false),
      persistenceLoaded: dailyStatus === 'READY',
      startingCompliance,
      isZeroYield,
      yieldRatio,
      currentYield, // Live-calculated yield for Training mode
      projectedResistanceStatus: (metaState.gameMode === 'PRACTICE' || !hasJoinedResistance)
        ? undefined
        : projectResistanceStatus, // Expose live resistance status

      // Alias for convenience if needed, though idiomatic to use data.toolsAvailable etc.
      selectedTool: coreState.selectedToolInstanceId,
      // trueYield/visibleYield removed
    },
    // UI Logic (The "ViewModel")
    interaction,
    // Event Handlers (The "Controller")
    actions: finalActions
  };
}
