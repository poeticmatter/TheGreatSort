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
            return { label: 'Submit to Audit', variant: 'gold', Icon: BadgeCheck };
        case 'ADEQUATE':
            return { label: 'Submit to Audit', variant: 'silver', Icon: BadgeCheck };
        case 'INITIAL':
            return { label: 'Inadequate', variant: 'neutral', Icon: EyeClosed };
        case 'SUSPICIOUS':
            return { label: 'Non-Compliant', variant: 'warning', Icon: Eye };
        case 'SABOTAGE':
            return { label: 'Sabotage', variant: 'destructive', Icon: ShieldAlert };
        default:
            return { label: 'Inspect', variant: 'neutral', Icon: Play };
    }
};

export const getPrimaryButtonVisuals = (
    phase: GamePhase,
    gameMode: GameMode,
    mood: SystemMood,
    isLocked: boolean
): ButtonVisualConfig => {
    // Practice Mode: Override all narrative-based logic
    if (gameMode === 'PRACTICE') {
        if (phase === GamePhase.RESULTS) {
            return { label: 'Continue Training', variant: 'warning', Icon: Play };
        }
        return { label: 'Inspect', variant: 'neutral', Icon: Play };
    }

    if (gameMode === 'DAILY' && isLocked) {
        return { label: 'Training', variant: 'destructive', Icon: Play };
    }

    if (phase === GamePhase.RESULTS) {
        if (gameMode === 'DAILY') {
            return { label: 'View Audit', variant: 'warning', Icon: Play };
        } else {
            return { label: 'Next Level', variant: 'warning', Icon: Play };
        }
    }

    // Inspecting Phase typically reuses Planning visuals effectively, 
    // or we could add a specific "Processing..." state here if desired.
    // For now, allow fall-through to mood config as per existing behavior.

    return getMoodButtonConfig(mood);
};

export const getSecondaryButtonVisuals = (
    phase: GamePhase,
    gameMode: GameMode,
    isLocked: boolean,
    isPerfect: boolean
): ButtonVisualConfig => {
    if (gameMode === 'DAILY' && phase === GamePhase.RESULTS && !isLocked) {
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
