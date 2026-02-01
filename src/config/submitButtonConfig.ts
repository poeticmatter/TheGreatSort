import { LucideIcon, BadgeCheck, ShieldAlert, Play, Eye, EyeClosed } from 'lucide-react';
import { SystemMood } from '../hooks/useSystemMood';

export type ButtonVariant = 'gold' | 'silver' | 'bronze' | 'neutral' | 'warning' | 'info' | 'destructive';

export interface SubmitButtonConfig {
    label: string;
    variant: ButtonVariant;
    Icon: LucideIcon;
}

export const getSubmitButtonConfig = (mood: SystemMood): SubmitButtonConfig => {
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
