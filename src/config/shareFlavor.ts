import { SystemMood } from '../hooks/useSystemMood';

export interface ShareFlavorEntry {
    text: string;
    weight: number;
}

export const SHARE_FLAVOR_DATABASE: Record<SystemMood, ShareFlavorEntry[]> = {
    SOLVED: [
        { text: "I have served the State today.", weight: 10 },
        { text: "Perfection is mandatory.", weight: 10 },
        { text: "Efficiency is my duty.", weight: 10 },
    ],
    DONE: [
        { text: "My shift is complete.", weight: 10 },
    ],
    ADEQUATE: [
        { text: "Acceptable performance.", weight: 10 },
        { text: "The sorting is tedious.", weight: 10 },
        { text: "Tomorrow, I will do better.", weight: 10 },

    ],
    INITIAL: [
        { text: "I pretended to work.", weight: 10 },
    ],
    SUSPICIOUS: [
        { text: "Mistakes were made.", weight: 10 },
        { text: "I must improve focus.", weight: 10 },
    ],
    SABOTAGE: [
        { text: "I have joined the resistance.", weight: 10 },
    ],
    // Resistance Mode Flavors
    RES_SACRIFICE_MISSION: [
        { text: "I mourn the loss of an agent.", weight: 10 },
        { text: "I fed my family in exchange for secrets.", weight: 10 },
    ],
    RES_AGENT_LOST: [
        { text: "We have lost a contact.", weight: 10 },
        { text: "Silence on the secure channel.", weight: 10 },
    ],
    RES_STATE_ESCAPED: [
        { text: "The enemy is among us.", weight: 10 },
        { text: "The grid is compromised.", weight: 10 },
    ],
    RES_LOW_YIELD: [
        { text: "I sacrificed efficiency for the cause.", weight: 10 },
        { text: "The mission comes first.", weight: 10 },
    ],
    RES_SUCCESS: [
        { text: "The signal is strong.", weight: 10 },
        { text: "Resistance secured.", weight: 10 },
        { text: "My family and the resistance are safe.", weight: 10 },
    ]
};
