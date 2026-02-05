import React, { useEffect, useRef, useCallback } from 'react';
import { GameState, GameAction } from '../reducers/gameState';
import { MetaState, MetaActions } from './useMetaGame';
import { ResistanceStatus } from '../../types';
import { verifyResistanceMission, gradeLevel } from '../utils/gameLogic';

interface UseResistanceSystemProps {
    coreState: GameState;
    coreDispatch: React.Dispatch<GameAction>;
    metaState: MetaState;
    metaActions: MetaActions;
    compliancePercentage: number;
    saveDailyResult: (score: number, resistanceStatus: ResistanceStatus) => void;
    retryDaily: () => void;
    nextLevel: () => void;
}

export function useResistanceSystem({
    coreState,
    coreDispatch,
    metaState,
    metaActions,
    compliancePercentage,
    saveDailyResult,
    retryDaily,
    nextLevel
}: UseResistanceSystemProps) {

    // Guard to prevent re-triggering the letter in the same session before reload
    const hasTriggeredResistance = useRef(false);

    // Zero-Yield Safety Net
    useEffect(() => {
        const scoresCalculated = coreState.optimalScore !== null && coreState.worstScore !== null;
        const joined = localStorage.getItem('joinedResistance') === 'true';

        // Guard: Only trigger resistance in DAILY mode
        if (
            metaState.gameMode === 'DAILY' &&
            scoresCalculated &&
            compliancePercentage === 0 &&
            !metaState.resistanceActive &&
            coreState.list.length > 0 &&
            !joined &&
            coreState.movesHistory.length > 0
        ) {
            if (localStorage.getItem('joinedResistance') !== 'true' && !hasTriggeredResistance.current) {
                hasTriggeredResistance.current = true;

                metaActions.triggerResistance();
                coreDispatch({ type: 'ACTIVATE_RESISTANCE' });
            }
        }
    }, [
        compliancePercentage,
        coreState.optimalScore,
        coreState.worstScore,
        metaState.resistanceActive,
        coreState.list.length,
        coreState.movesHistory.length,
        metaActions,
        metaState.gameMode,
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
        localStorage.setItem('joinedResistance', 'true');
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
        finalizeResistanceMission,
        closeResistanceAndReset
    };
}
