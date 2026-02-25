import { CheckCircle, AlertTriangle, FileText, LucideIcon } from 'lucide-react';
import { ResistanceStatus } from '../../types';

export interface ResistanceStatusConfig {
    color: string;
    text: string;
    description: string;
    icon: LucideIcon;
}

export const RESISTANCE_STATUS_CONFIG: Record<ResistanceStatus, ResistanceStatusConfig> = {
    // SUCCESS: Resistance agents survived AND State agents eliminated AND final yield >= targetYield.
    [ResistanceStatus.SUCCESS]: {
        color: 'blue',
        text: 'RESISTANCE MISSION ACCOMPLISHED',
        description: 'You are an asset to the resistance, friend.',
        icon: CheckCircle
    },
    // CAREFUL: Resistance agents survived AND State agents eliminated BUT final yield < targetYield.
    [ResistanceStatus.CAREFUL]: {
        color: 'amber',
        text: 'CAREFUL, FRIEND',
        description: 'Increase your yield to avoid suspicion.',
        icon: AlertTriangle
    },
    // EXPOSED: Resistance agent did not survive the sorting process.
    [ResistanceStatus.EXPOSED]: {
        color: 'red',
        text: 'WE ARE EXPOSED!',
        description: 'You must keep our agents safe!',
        icon: AlertTriangle
    },
    // COMPROMISED: State loyalist agent survived the sorting process.
    [ResistanceStatus.COMPROMISED]: {
        color: 'red',
        text: 'STATE AGENT ESCAPED',
        description: 'State agent escaped. Watch your back, they are coming for you.',
        icon: AlertTriangle
    },
    [ResistanceStatus.ACTIVE]: {
        color: 'stone',
        text: 'STATUS UNKNOWN',
        description: 'Awaiting confirmation on agent status.',
        icon: FileText
    },
    [ResistanceStatus.INACTIVE]: {
        color: 'stone',
        text: 'STATUS UNKNOWN',
        description: 'Awaiting confirmation on agent status.',
        icon: FileText
    }
};

export const getStatusConfig = (status: ResistanceStatus): ResistanceStatusConfig => {
    return RESISTANCE_STATUS_CONFIG[status] || RESISTANCE_STATUS_CONFIG[ResistanceStatus.ACTIVE];
};
