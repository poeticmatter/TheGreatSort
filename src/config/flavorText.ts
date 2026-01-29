import { SystemMood } from '../hooks/useSystemMood';

export interface FlavorEntry {
    text: string;
    weight: number; // Higher number = more frequent
}

export type FlavorCategory = SystemMood | 'IDLE';

export const FLAVOR_TEXT: Record<FlavorCategory, FlavorEntry[]> = {
    IDLE: [
        { text: "Awaiting input, Comrade.", weight: 10 },
        { text: "The queue grows impatient.", weight: 5 },
        { text: "Order must be maintained.", weight: 5 },
        { text: "Efficiency is our watchword.", weight: 3 },
    ],
    NORMAL: [
        { text: "Productivity: Optimal", weight: 10 },
        { text: "The Bureau commends your efficiency.", weight: 5 },
        { text: "Keep up the pace.", weight: 5 },
        { text: "Systems nominal.", weight: 8 },
    ],
    CONCERNED: [
        { text: "Notice: Efficiency falling below baseline.", weight: 10 },
        { text: "Your performance is being monitored.", weight: 5 },
        { text: "Do not falter.", weight: 5 },
        { text: "Metrics are dipping.", weight: 8 },
    ],
    HOSTILE: [
        { text: "Warning: Sabotage detected. Compliance mandatory.", weight: 10 },
        { text: "Incompetence will not be tolerated.", weight: 8 },
        { text: "The Ministry is watching.", weight: 8 },
        { text: "Correct course immediately.", weight: 5 },
    ],
    CRITICAL: [
        { text: "CRITICAL ERROR: ASSET LIQUIDATION IMMINENT.", weight: 10 },
        { text: "FAILURE PROMINENT. TERMINTATION SEQUENCE PRIMED.", weight: 8 },
        { text: "YOU HAVE FAILED THE STATE.", weight: 8 },
        { text: "ABORT. ABORT. ABORT.", weight: 5 },
    ]
};
