import { LucideIcon, BadgeCheck, SearchCode, RotateCcw, ShieldAlert, Lock, Play } from 'lucide-react';
import { SystemMood } from '../hooks/useSystemMood';

export type ButtonVariant = 'gold' | 'silver' | 'bronze' | 'neutral' | 'warning' | 'info' | 'destructive';

export interface SubmitButtonConfig {
    label: string;
    variant: ButtonVariant;
    Icon: LucideIcon;
}

export const getSubmitButtonConfig = (mood: SystemMood): SubmitButtonConfig => {
    switch (mood) {
        case 'DONE':
            return { label: 'Training', variant: 'destructive', Icon: ShieldAlert };
        case 'PERFECT':
            return { label: 'Submit to Audit', variant: 'gold', Icon: BadgeCheck };
        case 'ACCEPTABLE':
            return { label: 'Submit to Audit', variant: 'silver', Icon: BadgeCheck };
        case 'ADEQUATE':
            return { label: 'Submit to Audit', variant: 'bronze', Icon: BadgeCheck };
        case 'NORMAL':
            return { label: 'Inadequate', variant: 'neutral', Icon: SearchCode };
        case 'CONCERNED':
            return { label: 'Reset', variant: 'warning', Icon: RotateCcw };
        case 'SUSPICIOUS':
            return { label: 'Training', variant: 'destructive', Icon: ShieldAlert };
        case 'HOSTILE':
            return { label: 'Sabotage!', variant: 'destructive', Icon: Lock };
        default:
            return { label: 'Inspect', variant: 'neutral', Icon: Play };
    }
};
