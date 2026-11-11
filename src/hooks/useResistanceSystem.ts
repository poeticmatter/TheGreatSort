import React, { useCallback } from 'react';
import { GameState, GameAction } from '../reducers/gameState';
import { MetaState, MetaActions } from './useMetaGame';
import { ResistanceStatus } from '../../types';
import { PersistenceService } from '../services/persistence';
import { gradeLevel } from '../engine';
import { verifyResistanceMission, shouldTriggerResistance, selectResistanceTriggerContext } from '../utils/gameLogic';

interface UseResistanceSystemProps {
    coreState: GameState;
    coreDispatch: React.Dispatch<GameAction>;
    metaState: MetaState;
    metaActions: MetaActions;
    saveDailyResult: (score: number, resistanceStatus: ResistanceStatus) => void;
    retryDaily: () => void;
    nextLevel: () => void;
    hasJoinedResistance: boolean; // Now passed as prop instead of loading inside hook
}

export function useResistanceSystem({
    coreState,
    coreDispatch,
    metaState,
    metaActions,
    saveDailyResult,
    retryDaily,
    nextLevel,
    hasJoinedResistance
}: UseResistanceSystemProps) {

    // Intercept Model: Check Trigger via Selector
    const checkResistanceTrigger = useCallback(() => {
        const context = selectResistanceTriggerContext(
            coreState,
            metaState.gameMode,
            hasJoinedResistance
        );

        if (shouldTriggerResistance(context)) {
            coreDispatch({ type: 'ACTIVATE_RESISTANCE' });
        }
    }, [
        metaState.gameMode,
        coreState,
        hasJoinedResistance,
        coreDispatch
    ]);

    const finalizeResistanceMission = useCallback(() => {
        // Determine Final Resistance Status
        let finalStatus = coreState.resistance.status;

        if (coreState.resistance.status !== ResistanceStatus.INACTIVE) {
            const targetYield = coreState.resistance.targetYield || 0;
            const initialYield = coreState.initialList ? gradeLevel(coreState.initialList).score : 0;

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

    }, [
        saveDailyResult,
        coreState.levelScore,
        coreState.resistance,
        coreState.optimalScore,
        coreDispatch,
        metaActions,
        coreState.list,
        coreState.initialList
    ]);

    const closeResistanceAndReset = useCallback(() => {
        // 1. Commit the player to the resistance
        PersistenceService.saveResistanceStatus(true);

        // 2. Close the UI overlay
        coreDispatch({ type: 'CLOSE_RESISTANCE_VIEW' });

        // 3. Restart the level with the new status
        if (metaState.gameMode === 'DAILY') {
            retryDaily();
        } else {
            nextLevel();
        }
    }, [metaState.gameMode, retryDaily, nextLevel, coreDispatch]);

    return {
        checkResistanceTrigger,
        finalizeResistanceMission,
        closeResistanceAndReset
    };
}

