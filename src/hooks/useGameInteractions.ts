import { useMemo, useCallback } from 'react';
import { BadgeCheck, ShieldAlert, Play, Eye, EyeClosed, Repeat, RotateCcw, LucideIcon } from 'lucide-react';
import { GamePhase, GameMode } from '../../types';
import { SystemMood } from './useSystemMood';

// --- Types ---

export type ButtonVariant = 'gold' | 'silver' | 'bronze' | 'neutral' | 'warning' | 'info' | 'destructive' | 'default' | 'muted';

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

// --- Visual Helpers (Local) ---

const getMoodVisuals = (mood: SystemMood): { label: string; variant: ButtonVariant; Icon: LucideIcon } => {
    switch (mood) {
        case 'SOLVED':
            return { label: 'Submit to Audit', variant: 'gold', Icon: BadgeCheck };
        case 'ADEQUATE':
            return { label: 'Submit to Audit', variant: 'silver', Icon: BadgeCheck };
        case 'INITIAL':
            return { label: 'Inadequate', variant: 'neutral', Icon: EyeClosed };
        case 'SUSPICIOUS':
            return { label: 'Non-Compliant', variant: 'warning', Icon: Eye };
        case 'SABOTAGE':
            return { label: 'Terminate', variant: 'destructive', Icon: ShieldAlert };
        default:
            return { label: 'Inspect', variant: 'neutral', Icon: Play };
    }
};

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
        const isDailyLocked = (gameMode === 'DAILY' || gameMode === 'RESISTANCE') && isLocked;
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
        let label = 'Inspect';
        let variant: ButtonVariant = 'neutral';
        let Icon = Play;
        let onClick = actions.startInspection;
        let disabled = false;

        // 1. Daily Locked State (Overrides everything)
        if ((gameMode === 'DAILY' || gameMode === 'RESISTANCE') && isLocked) {
            label = 'Training';
            variant = 'destructive';
            Icon = Play;
            onClick = actions.retryPractice; // Navigate to Practice
            disabled = false;
        }
        // 2. Results Phase
        else if (phase === GamePhase.RESULTS) {
            // "DAILY" or "RESISTANCE" needs "View Audit"
            // "PRACTICE" needs "Next Level"

            const isDailyLike = gameMode === 'DAILY' || gameMode === 'RESISTANCE';

            onClick = isDailyLike
                ? () => { actions.saveDaily(); actions.triggerCurrentAudit(); }
                : actions.nextLevel;

            label = isDailyLike ? 'View Audit' : 'Next Level';
            variant = 'warning';
            Icon = Play;
        }
        // 3. Planning Phase (Mood Driven)
        else {
            const moodVisuals = getMoodVisuals(mood);
            label = moodVisuals.label;
            variant = moodVisuals.variant;
            Icon = moodVisuals.Icon;

            // Interaction logic usually stays 'startInspection', but if we want to differentiate 'Submit' vs 'Inspect' explicitly in the command:
            // The current flow uses 'startInspection' which triggers the engine.
            // If the user wants specific "Terminate" logic, it's likely handled by the engine or a specific action. 
            // For now, mapping all to startInspection is consistent with previous logic.
        }

        // 4. Global Disabled Rules
        if (phase === GamePhase.INSPECTING) {
            disabled = true;
        }

        return { label, variant, Icon, onClick, disabled };
    }, [phase, gameMode, mood, isLocked, actions]);


    // --- Secondary Action (Undo / Retry) ---
    const secondaryAction = useMemo<InteractionCommand | null>(() => {
        // Only show Secondary Action in certain states? 
        // Previously it was always rendered but maybe disabled.

        const isDailyRetry = (gameMode === 'DAILY' || gameMode === 'RESISTANCE') && phase === GamePhase.RESULTS && !isLocked;
        const isPracticeRetry = gameMode === 'PRACTICE' && phase === GamePhase.RESULTS;

        if (isDailyRetry || isPracticeRetry) {
            const isPerfect = compliancePercentage >= 100 || (optimalScore !== null && optimalScore === levelScore);
            return {
                label: 'RETRY',
                variant: isPerfect ? 'muted' : 'default',
                Icon: Repeat,
                onClick: (gameMode === 'DAILY' || gameMode === 'RESISTANCE') ? actions.retryDaily : actions.retryPractice,
                disabled: false
            };
        }

        // Default: Undo
        // Hide Undo if... actually previous logic didn't "hide" it, just disabled it maybe?
        // But returning null allows the UI to not render it if desired.
        // Let's keep it consistent: always return an object for Undo, possibly disabled.

        const canUndo = movesHistory.length > 0 && !isLocked && phase !== GamePhase.INSPECTING;

        return {
            label: 'UNDO',
            variant: 'default',
            Icon: RotateCcw,
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
