import { useMemo } from 'react';
import { GamePhase, GameMode } from '../../types';
import { SystemMood } from './useSystemMood';
import { getPrimaryButtonVisuals, getSecondaryButtonVisuals, ButtonVisualConfig } from '../config/submitButtonConfig';

export interface InteractionCommand extends ButtonVisualConfig {
    onClick: () => void;
    disabled: boolean;
}

export interface GameInteractions {
    primaryAction: InteractionCommand;
    secondaryAction: InteractionCommand;
}

export function useGameInteractions(state: any, actions: any): GameInteractions {
    const {
        phase,
        gameMode,
        mood,
        isLocked,
        movesHistory,
        optimalScore,
        levelScore,
        compliancePercentage
    } = state;

    const primaryAction = useMemo(() => {
        const visuals = getPrimaryButtonVisuals(phase, gameMode, mood, isLocked);

        let onClick = () => { };
        let disabled = false;

        // 1. Determine Action Handler
        if (gameMode === 'DAILY' && isLocked) {
            onClick = () => actions.changeMode('PRACTICE');
        } else if (phase === GamePhase.RESULTS) {
            if (gameMode === 'DAILY') {
                onClick = () => {
                    actions.saveDaily();
                    actions.triggerCurrentAudit();
                };
            } else {
                onClick = actions.nextLevel;
            }
        } else {
            // Planning / Inspecting / etc.
            onClick = actions.startInspection;
        }

        // 2. Determine Disabled State
        // If inspecting, generally disabled (unless specific cancel logic exists, which doesn't seem to)
        if (phase === GamePhase.INSPECTING) {
            disabled = true;
        }

        // Note: The "Training" button (Locked Daily) is effectively the only way to leave the locked screen, so it shouldn't be disabled.
        // The existing logic was: (isBoardDisabled && label !== 'Training') || phase === INSPECTING.
        // Since we handle the Training case specifically above, we just check phase for now.
        // Assuming "Locked" implies we are not Inspecting (we handled 'Locked' logic in visuals).

        return { ...visuals, onClick, disabled };
    }, [phase, gameMode, mood, isLocked, actions]);

    const secondaryAction = useMemo(() => {
        const isPerfect = compliancePercentage >= 100 || optimalScore === levelScore;
        const visuals = getSecondaryButtonVisuals(phase, gameMode, isLocked, isPerfect);

        // Logic for Secondary Action (Retry vs Undo)
        // If we are in Daily Results and NOT locked, it's a Retry.
        const isRetry = gameMode === 'DAILY' && phase === GamePhase.RESULTS && !isLocked;

        let onClick = actions.handleUndo;
        let disabled = false;

        if (isRetry) {
            onClick = actions.retryDaily;
            disabled = false; // Retry is always available in Results phase
        } else {
            // Undo Logic
            onClick = actions.handleUndo;
            // Disabled if no moves, or board is locked, or inspecting
            if (movesHistory.length === 0 || isLocked || phase === GamePhase.INSPECTING) {
                disabled = true;
            }
        }

        return { ...visuals, onClick, disabled };
    }, [phase, gameMode, isLocked, compliancePercentage, optimalScore, levelScore, actions, movesHistory.length]);

    return {
        primaryAction,
        secondaryAction
    };
}
