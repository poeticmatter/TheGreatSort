import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useCoreGame } from './useCoreGame';
import { useMetaGame } from './useMetaGame';
import { useSolverService } from './useSolverService';
import { useProjectedMetrics } from './useProjectedMetrics';
import { useSystemMood } from './useSystemMood';
import { GameHydrationService } from '../services/gameHydrationService'; // Import Hydration Service
import { useDailyChallenge } from './useDailyChallenge'; // Import Daily Hook
import { PuzzleRepository } from '../services/puzzleRepository'; // Helper usage if needed
import { GamePhase, GameMode, ResistanceStatus } from '../../types';
import { useGameInteractions } from './useGameInteractions'
import { useResistanceSystem } from './useResistanceSystem';
import { PersistenceService } from '../services/persistence';
import { useAnalytics } from './useAnalytics';

export function useGame(sessionDate: string) {

  // 1. Core Game (Board, Reducer, Loop)

  const { state: coreState, dispatch: coreDispatch, actions: coreActions } = useCoreGame();

  // 2. Meta Game (Mode, Audit, Resistance)
  const { metaState, metaActions } = useMetaGame(coreState, coreDispatch, sessionDate);
  const { trackPuzzleStarted, trackSequenceSubmitted, trackPuzzleRetried, trackPuzzleNext, trackShare, trackResistanceJoined } = useAnalytics();

  // --- Resistance System (State moved up for dependency injection) ---
  // Derive resistance status:
  // 1. Unlocked Status (Meta - Persisted): Has the user joined the resistance globally?

  // We initialize the unlocked status from persistence.
  const [hasUnlockedResistance, setHasUnlockedResistance] = useState(() => {
    const status = PersistenceService.loadResistanceStatus();
    return status;
  });

  // Re-sync resistance status when mode changes to ensure we catch updates
  useEffect(() => {
    const status = PersistenceService.loadResistanceStatus();
    setHasUnlockedResistance(status);
  }, [metaState.gameMode]);

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
    metaState.isGameLoaded,
    hasUnlockedResistance // Pass explicit status
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
    // Reducer automatically sets isLoaded = false when mode changes
    coreDispatch({ type: 'RESET_STATS' });
  }, [metaActions, coreActions, coreDispatch]);

  const retryDaily = useCallback(() => {
    const [y, m, d] = sessionDate.split('-').map(Number);
    const puzzleDate = new Date(y, m - 1, d);
    const puzzle = PuzzleRepository.getDailyPuzzle(puzzleDate);

    // Use centralized hydration logic
    const isResistant = PersistenceService.loadResistanceStatus();
    const { initialState } = GameHydrationService.hydrateResistanceDaily(puzzle, isResistant);

    coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: initialState } });
    coreDispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: false } });

    trackPuzzleRetried(metaState.gameMode);
    trackPuzzleStarted(metaState.gameMode);
  }, [sessionDate, coreDispatch, trackPuzzleStarted, trackPuzzleRetried]);

  const nextLevel = useCallback(() => {
    trackPuzzleNext('PRACTICE');
    const { initialState } = GameHydrationService.hydratePractice();
    coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: initialState } });
    trackPuzzleStarted('PRACTICE');
  }, [coreDispatch, trackPuzzleStarted, trackPuzzleNext]);

  // --- Resistance System ---
  // Derive resistance status:
  // 1. Unlocked Status (Meta - Persisted): Has the user joined the resistance globally?
  // 2. Active Status (Session - State): Is the current game running in resistance mode?

  // Internal Logic relies on checking if the *Current Session* is active (e.g. for triggering events).
  const isResistanceActive = coreState.resistance?.status !== ResistanceStatus.INACTIVE;

  const { finalizeResistanceMission, closeResistanceAndReset: originalCloseResistanceAndReset, checkResistanceTrigger } = useResistanceSystem({
    coreState,
    coreDispatch,
    metaState,
    metaActions,
    saveDailyResult,
    retryDaily,
    nextLevel,
    hasJoinedResistance: isResistanceActive // Logic uses Active status
  });

  // Wrapper to update local state when joining
  const closeResistanceAndReset = useCallback(() => {
    // If we joined, we want to ensure the game reflects that state
    if (PersistenceService.loadResistanceStatus()) {
      metaActions.setGameMode('DAILY');
      setHasUnlockedResistance(true); // Ensure UI reflects unlock
    }
    originalCloseResistanceAndReset();
  }, [originalCloseResistanceAndReset, coreDispatch, metaActions]);


  // --- Inspector Run Tracking ---
  const prevPhase = useRef(coreState.phase);

  useEffect(() => {
    if (prevPhase.current === GamePhase.INSPECTING && coreState.phase === GamePhase.RESULTS) {
      // Logic vs View Separation:
      // Fire trackSequenceSubmitted immediately when validation logic completes

      const score = coreState.levelScore;
      const optimal = coreState.optimalScore || 0;
      const isSolved = score >= optimal;

      const result = isSolved ? 'SOLVED' : 'UNSOLVED';

      trackSequenceSubmitted(
        metaState.gameMode,
        score,
        result,
        compliancePercentage,
        coreState.resistance?.targetYield || 0
      );

      // Explicit Resistance Trigger: Check if user submitted a sabotaged board
      if (metaState.gameMode === 'DAILY' && !isResistanceActive) {
        checkResistanceTrigger();
      }
    }
    prevPhase.current = coreState.phase;
  }, [coreState.phase, coreState.levelScore, coreState.optimalScore, metaState.gameMode, compliancePercentage, coreState.resistance?.targetYield, trackSequenceSubmitted, isResistanceActive, checkResistanceTrigger]);


  // --- Initialization ---

  useEffect(() => {
    if (metaState.isGameLoaded) return;

    if (metaState.gameMode === 'DAILY') {
      if (dailyStatus === 'READY' && dailyConfig) {
        // Hydration via useDailyChallenge already handles resistance injection
        // Reducer handles isLoaded = true
        coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: dailyConfig } });

        if (dailyConfig.optimalScore) coreDispatch({ type: 'SET_OPTIMAL_SCORE', payload: { score: dailyConfig.optimalScore } });
        if (dailyConfig.worstScore) coreDispatch({ type: 'SET_WORST_SCORE', payload: { score: dailyConfig.worstScore } });
        if (dailyConfig.dailyCompleted) coreDispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: true } });

        trackPuzzleStarted(metaState.gameMode);
      }
    }
    else if (metaState.gameMode === 'PRACTICE') {
      const result = GameHydrationService.hydratePractice();
      coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: result.initialState } });
      trackPuzzleStarted('PRACTICE');
    }
  }, [
    metaState.isGameLoaded,
    metaState.gameMode,
    dailyStatus,
    dailyConfig,
    coreDispatch,
    // metaActions removed
    trackPuzzleStarted
  ]);


  // --- Actions ---

  const retryPractice = useCallback(() => {
    if (metaState.gameMode === 'PRACTICE' && coreState.currentSeed !== undefined) {
      const { initialState } = GameHydrationService.hydratePractice(coreState.currentSeed);
      coreDispatch({ type: 'INITIALIZE_GAME', payload: { state: initialState } });
      trackPuzzleStarted('PRACTICE');
      trackPuzzleRetried('PRACTICE');
    } else {
      changeMode('PRACTICE');
    }
  }, [metaState.gameMode, coreState.currentSeed, coreDispatch, changeMode, trackPuzzleStarted, trackPuzzleRetried]);





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
      coreDispatch({ type: 'ACTIVATE_RESISTANCE' });
      metaActions.setGameMode('DAILY');
      PersistenceService.saveResistanceStatus(true);
      setHasUnlockedResistance(true);
      trackResistanceJoined(metaState.gameMode);
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
      isResistanceModalOpen: (metaState.gameMode === 'PRACTICE' || metaState.gameMode === 'TUTORIAL') ? false : (coreState.resistance?.isViewOpen ?? false),
      hasJoinedResistance: hasUnlockedResistance, // Exposed for UI reactivity (using Persisted Status)
      persistenceLoaded: dailyStatus === 'READY',
      startingCompliance,
      isZeroYield,
      yieldRatio,
      currentYield, // Live-calculated yield for Training mode
      projectedResistanceStatus: (metaState.gameMode === 'PRACTICE')
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
