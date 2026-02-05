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

    // Guard to prevent re-triggering the letter in the same session before reload
    const hasTriggeredResistance = useRef(false);

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
            resistanceActive: metaState.resistanceActive,
            scoresCalculated,
            compliancePercentage,
            listLength: currentList.length,
            hasJoined: joined,
            movesCount: movesCount,
            hasTriggeredLocal: hasTriggeredResistance.current
        })) {
            hasTriggeredResistance.current = true;
            metaActions.triggerResistance();
            coreDispatch({ type: 'ACTIVATE_RESISTANCE' });
        }
    }, [
        metaState.gameMode,
        metaState.resistanceActive,
        metaActions,
        coreDispatch
    ]);

    const finalizeResistanceMission = useCallback(() => {
        // Determine Final Resistance Status
        let finalStatus = coreState.resistanceStatus;

        if (coreState.resistanceStatus !== ResistanceStatus.INACTIVE) {
            // Fetch Targets
            // We rely on state resistanceTarget or fallback to 0 (which shouldn't happen if mode active)
            const targetYield = coreState.resistanceTarget || 0;

            // Calculate Initial Yield (for floor check logic in verification if needed)
            const initialYield = coreState.initialList ? gradeLevel(coreState.initialList).score : 0;

            // Verify
            finalStatus = verifyResistanceMission(
                coreState.list,
                coreState.resistanceStatus,
                coreState.list.length,
                initialYield,
                targetYield
            );
        }

        // Composite action: Save Persist + Meta Update
        saveDailyResult(coreState.levelScore, finalStatus);
        coreDispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: true } });
        metaActions.setResistancePending(true);
        metaActions.trackGameComplete('DAILY', coreState.levelScore, coreState.optimalScore);
    }, [
        saveDailyResult,
        coreState.levelScore,
        coreState.resistanceStatus,
        coreState.resistanceTarget,
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
        hasTriggeredResistance.current = true;

        // 2. Close the UI overlay
        metaActions.closeResistance();

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
