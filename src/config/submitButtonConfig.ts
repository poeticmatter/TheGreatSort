import { LucideIcon, BadgeCheck, ShieldAlert, Play, Eye, EyeClosed, Repeat, RotateCcw } from 'lucide-react';
import { SystemMood } from '../hooks/useSystemMood';
import { GamePhase, GameMode } from '../../types';

export type ButtonVariant = 'gold' | 'silver' | 'bronze' | 'neutral' | 'warning' | 'info' | 'destructive' | 'default' | 'muted';

export interface ButtonVisualConfig {
    label: string;
    variant: ButtonVariant;
    Icon: LucideIcon;
}

// Helper to get Mood-based visuals (Planning Phase)
export const getMoodButtonConfig = (mood: SystemMood): ButtonVisualConfig => {
    switch (mood) {
        case 'SOLVED':
            return { label: 'Verify Compliance', variant: 'gold', Icon: BadgeCheck };
        case 'ADEQUATE':
            return { label: 'Provisional Waiver', variant: 'silver', Icon: BadgeCheck };
        case 'INITIAL':
            return { label: 'File Negligence', variant: 'neutral', Icon: EyeClosed };
        case 'SUSPICIOUS':
            return { label: 'Request Correction', variant: 'warning', Icon: Eye };
        case 'SABOTAGE':
            return { label: 'Flag Anomaly', variant: 'destructive', Icon: ShieldAlert };
        default:
            return { label: 'Inspect', variant: 'neutral', Icon: Play };
    }
};

export const getPrimaryButtonVisuals = (
    phase: GamePhase,
    gameMode: GameMode,
    mood: SystemMood,
): ButtonVisualConfig => {
    // Practice Mode: Override all narrative-based logic
    if (gameMode === 'PRACTICE') {
        if (phase === GamePhase.RESULTS) {
            return { label: 'Proceed', variant: 'warning', Icon: Play };
        }
        return { label: 'Inspect', variant: 'neutral', Icon: Play };
    }

    if (phase === GamePhase.RESULTS) {
        return { label: 'Review Audit', variant: 'warning', Icon: Play };
    }

    return getMoodButtonConfig(mood);
};

export const getSecondaryButtonVisuals = (
    phase: GamePhase,
    gameMode: GameMode,
    isLocked: boolean,
    isPerfect: boolean
): ButtonVisualConfig => {
    const isDailyRetry = gameMode === 'DAILY' && phase === GamePhase.RESULTS && !isLocked;
    const isPracticeRetry = gameMode === 'PRACTICE' && phase === GamePhase.RESULTS;

    if (isDailyRetry || isPracticeRetry) {
        return {
            label: 'RETRY',
            variant: isPerfect ? 'muted' : 'default',
            Icon: Repeat
        };
    }

    return {
        label: 'UNDO',
        variant: 'default',
        Icon: RotateCcw
    };
};
