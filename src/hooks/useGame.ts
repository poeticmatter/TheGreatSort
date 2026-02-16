import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
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
import { useAnalytics } from './useAnalytics';

export function useGame(sessionDate: string) {

  // 1. Core Game (Board, Reducer, Loop)

  const { state: coreState, dispatch: coreDispatch, actions: coreActions } = useCoreGame();

  // 2. Meta Game (Mode, Audit, Resistance)
  const { metaState, metaActions } = useMetaGame(coreState, coreDispatch, sessionDate);
  const { trackLevelStart, trackInspectorRun, trackLevelAction, trackShare, trackResistanceJoined } = useAnalytics();

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
  // Construct a clean set of tools (unused) for the solver to ensure it solves from scratch
  const initialToolsForSolver = useMemo(() =>
    coreState.toolsAvailable.map(t => ({ ...t, used: false })),
    [coreState.toolsAvailable]
  );

  const solverState = useSolverService(
    coreState.currentSeed,
    metaState.gameMode,
    coreState.initialList || coreState.list, // Use initial list if available
    initialToolsForSolver, // Use clean tools
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
      initialState.resistance!.status = ResistanceStatus.ACTIVE;
    }
    coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: initialState } });
    coreDispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: false } });
    // Dailies usually start immediately? No, user sees intro maybe? 
    // If it initializes, we track start.
    const effectiveMode = PersistenceService.loadResistanceStatus() ? 'RESISTANCE' : 'DAILY';
    trackLevelAction('retry', effectiveMode as any);
    trackLevelStart(effectiveMode as any);
  }, [sessionDate, coreDispatch, trackLevelStart, trackLevelAction]);

  const nextLevel = useCallback(() => {
    trackLevelAction('next_level', 'PRACTICE');
    const { initialState } = GameHydrationService.hydratePractice();
    coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: initialState } });
    trackLevelStart('PRACTICE');
  }, [coreDispatch, trackLevelStart, trackLevelAction]);

  // --- Resistance System ---
  // Reactive State for Resistance Status to ensure UI updates immediately
  const [hasJoinedResistance, setHasJoinedResistance] = useState(PersistenceService.loadResistanceStatus());

  const { finalizeResistanceMission, closeResistanceAndReset: originalCloseResistanceAndReset, checkResistanceTrigger } = useResistanceSystem({
    coreState,
    coreDispatch,
    metaState,
    metaActions,
    saveDailyResult,
    retryDaily,
    nextLevel,
    hasJoinedResistance
  });

  // Wrapper to update local state when joining
  const closeResistanceAndReset = useCallback(() => {
    setHasJoinedResistance(true); // Update local state
    originalCloseResistanceAndReset();
  }, [originalCloseResistanceAndReset]);


  // --- Inspector Run Tracking ---
  const prevPhase = useRef(coreState.phase);

  useEffect(() => {
    if (prevPhase.current === GamePhase.INSPECTING && coreState.phase === GamePhase.RESULTS) {
      // Logic vs View Separation:
      // Fire trackInspectorRun immediately when validation logic completes

      const score = coreState.levelScore;
      const optimal = coreState.optimalScore || 0;
      const isSolved = score >= optimal;

      const effectiveMode = metaState.gameMode === 'DAILY' && hasJoinedResistance ? 'RESISTANCE' : metaState.gameMode;
      const result = isSolved ? 'SOLVED' : 'UNSOLVED';

      trackInspectorRun(effectiveMode as any, score, result);

      // Explicit Resistance Trigger: Check if user submitted a sabotaged board
      if (metaState.gameMode === 'DAILY' && !hasJoinedResistance) {
        checkResistanceTrigger();
      }
    }
    prevPhase.current = coreState.phase;
  }, [coreState.phase, coreState.levelScore, coreState.optimalScore, metaState.gameMode, trackInspectorRun, hasJoinedResistance, checkResistanceTrigger]);


  // --- Initialization ---

  useEffect(() => {
    if (metaState.isGameLoaded) return;

    if (metaState.gameMode === 'DAILY' || metaState.gameMode === 'RESISTANCE') {
      if (dailyStatus === 'READY' && dailyConfig) {
        if (PersistenceService.loadResistanceStatus()) {
          dailyConfig.resistance!.status = ResistanceStatus.ACTIVE;
          dailyConfig.gameMode = 'RESISTANCE';
        }
        coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: dailyConfig } });
        metaActions.setIsGameLoaded(true);
        if (dailyConfig.optimalScore) coreDispatch({ type: 'SET_OPTIMAL_SCORE', payload: { score: dailyConfig.optimalScore } });
        if (dailyConfig.worstScore) coreDispatch({ type: 'SET_WORST_SCORE', payload: { score: dailyConfig.worstScore } });
        if (dailyConfig.dailyCompleted) coreDispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: true } });

        // Initial Game Start Logic for Daily
        const effectiveMode = PersistenceService.loadResistanceStatus() ? 'RESISTANCE' : 'DAILY';
        trackLevelStart(effectiveMode as any);
      }
    }
    else if (metaState.gameMode === 'PRACTICE') {
      const result = GameHydrationService.hydratePractice();
      coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: result.initialState } });
      metaActions.setIsGameLoaded(true);
      trackLevelStart('PRACTICE');
    }
  }, [
    metaState.isGameLoaded,
    metaState.gameMode,
    dailyStatus,
    dailyConfig,
    coreDispatch,
    metaActions,
    trackLevelStart
  ]);


  // --- Actions ---

  const retryPractice = useCallback(() => {
    if (metaState.gameMode === 'PRACTICE' && coreState.currentSeed !== undefined) {
      const { initialState } = GameHydrationService.hydratePractice(coreState.currentSeed);
      coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: initialState } });
      trackLevelStart('PRACTICE');
      trackLevelAction('retry', 'PRACTICE');
    } else {
      changeMode('PRACTICE');
    }
  }, [metaState.gameMode, coreState.currentSeed, coreDispatch, changeMode, trackLevelStart, trackLevelAction]);





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

    closeAudit: metaActions.closeAudit,
    triggerCurrentAudit: metaActions.triggerCurrentAudit,
    triggerResistance: () => coreDispatch({ type: 'ACTIVATE_RESISTANCE' }),
    closeResistance: closeResistanceAndReset,
    joinResistance: () => {
      setHasJoinedResistance(true);
      PersistenceService.saveResistanceStatus(true);
      trackResistanceJoined();
    },
    dismissResistance: () => coreDispatch({ type: 'CLOSE_RESISTANCE_VIEW' }),
    saveDaily: finalizeResistanceMission,
    trackShare,
    showLockedResistance: () => coreDispatch({ type: 'SHOW_LOCKED_RESISTANCE' })
  }), [
    changeMode,
    coreActions,
    nextLevel,
    retryPractice,
    retryDaily,
    metaState.gameMode,

    metaActions,
    closeResistanceAndReset,
    finalizeResistanceMission,
    trackShare
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
      isResistanceModalOpen: metaState.gameMode === 'PRACTICE' ? false : (coreState.resistance?.isViewOpen ?? false),
      hasJoinedResistance, // Exposed for UI reactivity
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
