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
        { text: "The system works.", weight: 10 },
    ],
    DONE: [
        { text: "My shift is complete.", weight: 10 },
        { text: "Tomorrow, I will do better.", weight: 10 },
        { text: "The work continues.", weight: 10 },
    ],
    ADEQUATE: [
        { text: "I have met the quota.", weight: 10 },
        { text: "Acceptable performance.", weight: 10 },
        { text: "Standard deviation nominal.", weight: 10 },
    ],
    INITIAL: [
        { text: "Processing...", weight: 10 },
        { text: "Awaiting instructions.", weight: 10 },
    ],
    SUSPICIOUS: [
        { text: "Mistakes were made.", weight: 10 },
        { text: "I must improve focus.", weight: 10 },
        { text: "Complexity is high.", weight: 10 },
    ],
    SABOTAGE: [
        { text: "I have failed the State.", weight: 10 },
        { text: "Forgive my inefficiency.", weight: 10 },
        { text: "Errors detected.", weight: 10 },
    ]
};
