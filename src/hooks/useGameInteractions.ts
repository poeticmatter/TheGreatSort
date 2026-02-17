import { useMemo } from 'react';
import { LucideIcon } from 'lucide-react';
import { GamePhase } from '../../types';
import { getPrimaryButtonVisuals, getSecondaryButtonVisuals, ButtonVariant } from '../config/submitButtonConfig';

// --- Types ---

export interface InteractionCommand {
    label: string;
    variant: ButtonVariant;
    Icon: LucideIcon;
    onClick: () => void;
    disabled: boolean;
}

export interface UserInterfaceFeedback {
    showAuditBoard: boolean;
    isBoardDisabled: boolean; // For preventing board interactions/toolbelt
    allowedIndices?: number[];
}

export interface UserInterfaceState {
    primaryAction: InteractionCommand;
    secondaryAction: InteractionCommand | null;
    feedback: UserInterfaceFeedback;
}

// --- Hook Implementation ---

export function useGameInteractions(state: any, actions: any): UserInterfaceState {
    const {
        phase,
        gameMode,
        mood,
        isLocked,
        auditState,
        movesHistory,
        optimalScore,
        levelScore,
        compliancePercentage
    } = state;

    // --- Feedback Logic ---
    const feedback = useMemo<UserInterfaceFeedback>(() => {
        const isDailyLocked = gameMode === 'DAILY' && isLocked;
        const showAuditBoard = isDailyLocked || !!auditState;

        // Controls are disabled if the board is locked (Daily solved/failed) OR if we are inspecting (running simulation)
        // Wait, if showAuditBoard is true, we are likely treating it as "disabled" for the Main PuzzleBoard anyway.
        // But specifically for the ToolBelt and Board interactions:
        const isBoardDisabled = isDailyLocked || phase === GamePhase.INSPECTING;

        return {
            showAuditBoard,
            isBoardDisabled
        };
    }, [gameMode, isLocked, auditState, phase]);


    // --- Primary Action (Submit / Inspect / Next) ---
    const primaryAction = useMemo<InteractionCommand>(() => {
        const { label, variant, Icon } = getPrimaryButtonVisuals(phase, gameMode, mood);

        let onClick = actions.startInspection;
        let disabled = false;

        // Determine click handler based on state
        if (gameMode === 'PRACTICE' && phase === GamePhase.RESULTS) {
            onClick = actions.nextLevel;
        } else if (gameMode === 'DAILY' && isLocked) {
            onClick = actions.retryPractice;
        } else if (phase === GamePhase.RESULTS) {
            if (gameMode === 'DAILY') {
                onClick = () => { actions.saveDaily(); actions.triggerCurrentAudit(); };
            } else {
                onClick = actions.nextLevel;
            }
        }

        // Global Disabled Rules
        if (phase === GamePhase.INSPECTING) {
            disabled = true;
        }

        return { label, variant, Icon, onClick, disabled };
    }, [phase, gameMode, mood, isLocked, actions]);


    // --- Secondary Action (Undo / Retry) ---
    const secondaryAction = useMemo<InteractionCommand | null>(() => {
        const isPerfect = compliancePercentage >= 100 || (optimalScore !== null && optimalScore === levelScore);
        const { label, variant, Icon } = getSecondaryButtonVisuals(phase, gameMode, isLocked, isPerfect);

        const isDailyRetry = gameMode === 'DAILY' && phase === GamePhase.RESULTS && !isLocked;
        const isPracticeRetry = gameMode === 'PRACTICE' && phase === GamePhase.RESULTS;

        if (isDailyRetry || isPracticeRetry) {
            return {
                label,
                variant,
                Icon,
                onClick: gameMode === 'DAILY' ? actions.retryDaily : actions.retryPractice,
                disabled: false
            };
        }

        const canUndo = movesHistory.length > 0 && !isLocked && phase !== GamePhase.INSPECTING;

        return {
            label,
            variant,
            Icon,
            onClick: actions.handleUndo,
            disabled: !canUndo
        };
    }, [phase, gameMode, isLocked, movesHistory.length, compliancePercentage, optimalScore, levelScore, actions]);

    return useMemo(() => ({
        primaryAction,
        secondaryAction,
        feedback
    }), [primaryAction, secondaryAction, feedback]);
}
