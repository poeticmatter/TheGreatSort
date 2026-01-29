import { SystemMood } from '../hooks/useSystemMood';

export type FlavorKey = 'IDLE' | 'NORMAL' | 'CONCERNED' | 'HOSTILE' | 'CRITICAL';

export interface FlavorEntry {
    text: string;
    weight: number; // 1 = common, 0.1 = rare
}

export const FLAVOR_DATABASE: Record<FlavorKey, FlavorEntry[]> = {
    IDLE: [
        { text: "Awaiting input, Comrade.", weight: 1.0 },
        { text: "The queue grows impatient.", weight: 0.5 },
        { text: "Order must be maintained.", weight: 0.5 },
        { text: "Efficiency is our watchword.", weight: 0.3 },
    ],
    NORMAL: [
        { text: "Productivity: Optimal", weight: 1.0 },
        { text: "The Bureau commends your efficiency.", weight: 0.5 },
        { text: "Keep up the pace.", weight: 0.5 },
        { text: "Systems nominal.", weight: 0.8 },
    ],
    CONCERNED: [
        { text: "Notice: Efficiency falling below baseline.", weight: 1.0 },
        { text: "Your performance is being monitored.", weight: 0.5 },
        { text: "Do not falter.", weight: 0.5 },
        { text: "Metrics are dipping.", weight: 0.8 },
    ],
    HOSTILE: [
        { text: "Warning: Sabotage detected. Compliance mandatory.", weight: 1.0 },
        { text: "Incompetence will not be tolerated.", weight: 0.8 },
        { text: "The Ministry is watching.", weight: 0.8 },
        { text: "Correct course immediately.", weight: 0.5 },
    ],
    CRITICAL: [
        { text: "CRITICAL ERROR: ASSET LIQUIDATION IMMINENT.", weight: 1.0 },
        { text: "FAILURE PROMINENT. TERMINATION SEQUENCE PRIMED.", weight: 0.8 },
        { text: "YOU HAVE FAILED THE STATE.", weight: 0.8 },
        { text: "ABORT. ABORT. ABORT.", weight: 0.5 },
    ]
};
