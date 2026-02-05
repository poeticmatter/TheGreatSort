import React, { useRef, useCallback } from 'react';
import { GameState, GameAction } from '../reducers/gameState';
import { MetaState, MetaActions } from './useMetaGame';
import { ResistanceStatus, CardItem } from '../../types';
import { PersistenceService } from '../services/persistence';
import { verifyResistanceMission, gradeLevel, shouldTriggerResistance, calculateCompliance } from '../utils/gameLogic';

interface UseResistanceSystemProps {
    coreState: GameState;
    coreDispatch: React.Dispatch<GameAction>;
    metaState: MetaState;
    metaActions: MetaActions;
    saveDailyResult: (score: number, resistanceStatus: ResistanceStatus) => void;
    retryDaily: () => void;
    nextLevel: () => void;
}

export function useResistanceSystem({
    coreState,
    coreDispatch,
    metaState,
    metaActions,
    saveDailyResult,
    retryDaily,
    nextLevel
}: UseResistanceSystemProps) {



    // Intercept Model: Check Trigger Explicitly
    const checkResistanceTrigger = useCallback((
        currentList: CardItem[],
        optimalScore: number | null,
        worstScore: number | null,
        movesCount: number
    ) => {
        // 1. Calculate Metrics on the Fly
        const { score: currentYield } = gradeLevel(currentList);
        const compliancePercentage = calculateCompliance(currentYield, optimalScore, worstScore);
        const scoresCalculated = optimalScore !== null && worstScore !== null;
        const joined = PersistenceService.loadResistanceStatus();

        // 2. Evaluate Rule
        if (shouldTriggerResistance({
            gameMode: metaState.gameMode,
            resistanceActive: coreState.resistance.isViewOpen || coreState.resistance.status !== ResistanceStatus.INACTIVE,
            scoresCalculated,
            compliancePercentage,
            listLength: currentList.length,
            hasJoined: joined,
            movesCount: movesCount,
            hasTriggeredLocal: coreState.resistance.hasTriggered
        })) {
            // metaActions.triggerResistance(); // REMOVED: Now handled by reducer
            coreDispatch({ type: 'ACTIVATE_RESISTANCE' });
        }
    }, [
        metaState.gameMode,
        coreState.resistance, // Depend on resistance state object
        metaActions,
        coreDispatch
    ]);

    const finalizeResistanceMission = useCallback(() => {
        // Determine Final Resistance Status
        let finalStatus = coreState.resistance.status;

        if (coreState.resistance.status !== ResistanceStatus.INACTIVE) {
            // Fetch Targets
            // We rely on state resistanceTarget or fallback to 0 (which shouldn't happen if mode active)
            const targetYield = coreState.resistance.targetYield || 0;

            // Calculate Initial Yield (for floor check logic in verification if needed)
            const initialYield = coreState.initialList ? gradeLevel(coreState.initialList).score : 0;

            // Verify
            finalStatus = verifyResistanceMission(
                coreState.list,
                coreState.resistance.status,
                coreState.list.length,
                initialYield,
                targetYield
            );
        }

        // Composite action: Save Persist + Meta Update
        saveDailyResult(coreState.levelScore, finalStatus);
        coreDispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: true } });
        // metaActions.setResistancePending(true); // REPLACED
        coreDispatch({ type: 'SET_RESISTANCE_PENDING', payload: { pending: true } });
        metaActions.trackGameComplete('DAILY', coreState.levelScore, coreState.optimalScore);
    }, [
        saveDailyResult,
        coreState.levelScore,
        coreState.resistance, // Updated dependency
        coreState.optimalScore,
        coreDispatch,
        metaActions,
        coreState.list,
        coreState.initialList
    ]);

    const closeResistanceAndReset = useCallback(() => {
        // 1. Commit the player to the resistance
        PersistenceService.saveResistanceStatus(true);
        // Ensure we don't re-trigger immediately (though reload will reset this, localstorage protects it then)
        // hasTriggeredResistance.current = true; // Handled in Reducer now

        // 2. Close the UI overlay
        // metaActions.closeResistance(); // REPLACED
        coreDispatch({ type: 'CLOSE_RESISTANCE_VIEW' });

        // 3. Restart the level with the new status
        if (metaState.gameMode === 'DAILY') {
            retryDaily();
        } else {
            nextLevel();
        }
    }, [metaActions, metaState.gameMode, retryDaily, nextLevel]);

    return {
        checkResistanceTrigger,
        finalizeResistanceMission,
        closeResistanceAndReset
    };
}
