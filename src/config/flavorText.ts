export type FlavorKey = 'SOLVED' | 'DONE' | 'ADEQUATE' | 'INITIAL' | 'SUSPICIOUS' | 'SABOTAGE' | 'RES_SACRIFICE_MISSION' | 'RES_AGENT_LOST' | 'RES_STATE_ESCAPED' | 'RES_LOW_YIELD' | 'RES_SUCCESS';

export interface FlavorEntry {
    text: string;
    weight: number;
}

export const FLAVOR_DATABASE: Record<FlavorKey, FlavorEntry[]> = {
    SOLVED: [
        { text: "No wasted resources.", weight: 10 },
        { text: "Compliance achieved.", weight: 10 },
        { text: "Systems nominal", weight: 10 },
        { text: "Sorting complete.", weight: 10 },
        { text: "For the state.", weight: 5 },
        { text: "The Ministry approves.", weight: 5 },
        { text: "I am satisfied.", weight: 5 },
        { text: "My family will eat today.", weight: 5 },
        { text: "I keep my family fed.", weight: 5 },
        { text: "I will keep my job.", weight: 5 },
        { text: "I will keep my family safe.", weight: 5 },
        { text: "I will keep my family healthy.", weight: 5 },
        { text: "The state approves, yet we struggle.", weight: 1 },

    ],
    DONE: [
        { text: "Daily quota complete, comrade. Your duties lie with your family now, come back tomorrow for more work.", weight: 10 }
    ],
    ADEQUATE: [
        { text: "Acceptable deviation.", weight: 10 },
        { text: "Within limits.", weight: 10 },
        { text: "Compliance verified.", weight: 10 },
        { text: "Standard met.", weight: 10 },
        { text: "Standards met.", weight: 10 },
        { text: "Keep sorting.", weight: 10 },
        { text: "Notable effort.", weight: 1 },
        { text: "The state demands more", weight: 5 },
        { text: "For my family, I must sort better.", weight: 1 },
        { text: "Is there really a way out?", weight: 1 },
        { text: "There is no solution.", weight: 1 },
    ],
    INITIAL: [
        { text: "Awaiting input.", weight: 10 },
        { text: "Routine operations.", weight: 10 },
        { text: "Processing...", weight: 10 },
        { text: "Begin sorting operations", weight: 10 },
        { text: "Day 4239...", weight: 5 },
        { text: "The hum of the machine.", weight: 5 },
        { text: "Do not be distracted.", weight: 5 },
        { text: "Focus on the sort.", weight: 5 },
        { text: "I am tired.", weight: 1 },
        { text: "I should have stayed in bed.", weight: 1 },
    ],
    SUSPICIOUS: [
        { text: "Remain compliant.", weight: 10 },
        { text: "Warning issued.", weight: 10 },
        { text: "Suspicious activity detected.", weight: 10 },
        { text: "The Manager is watching.", weight: 10 },
        { text: "Irregularities found.", weight: 10 },
        { text: "Sorting error?", weight: 10 },
        { text: "Are you working?", weight: 10 },
        { text: "Questionable moves, comrade", weight: 10 },
        { text: "Flagged for review.", weight: 5 },
        { text: "Who are you working for?", weight: 1 },
        { text: "Are you part of the resistance?", weight: 1 },
        { text: "You will be interrogated.", weight: 1 },
        { text: "We see you.", weight: 1 },
        { text: "Think of your family.", weight: 1 },
        { text: "I must find a way out.", weight: 1 },
    ],
    SABOTAGE: [
        { text: "SABOTAGE!", weight: 10 },
        { text: "ERROR! ERROR!", weight: 10 },
        { text: "TERMINATE NOW!", weight: 10 },
        { text: "COMPLY OR PERISH!", weight: 10 },
        { text: "STOP!", weight: 10 },
        { text: "SYSTEM PURGE!", weight: 5 },
        { text: "THE STATE COMES FIRST!", weight: 5 },
        { text: "RESISTANCE IS FUTILE!", weight: 1 },
        { text: "REISTANCE AGENT DETECTED!", weight: 1 },
        { text: "TRAITOR!", weight: 1 },

    ],
    // Resistance Mode Flavors
    RES_SACRIFICE_MISSION: [
        { text: "I sacrifice the mission to maintain appearances.", weight: 10 },
        { text: "Blending in requires sacrifice.", weight: 5 },
        { text: "The data must flow perfectly to hide within it.", weight: 5 },
        { text: "My family must eat.", weight: 1 },
        { text: "I will keep my family fed.", weight: 1 },
    ],
    RES_AGENT_LOST: [
        { text: "For the resistance, I will find the solution.", weight: 10 },
        { text: "We have lost a contact. Proceeding with mission.", weight: 5 },
        { text: "Silence on the secure channel.", weight: 5 },
        { text: "The resistance will find a way.", weight: 5 },
        { text: "I will find you, friend.", weight: 1 },
        { text: "Resist, we're coming.", weight: 1 },

    ],
    RES_STATE_ESCAPED: [
        { text: "The enemy is among us.", weight: 10 },
        { text: "Our grid is compromised.", weight: 5 },
        { text: "A shadow remains in the system.", weight: 5 },
        { text: "The police are closing in.", weight: 1 },
        { text: "I will be found.", weight: 1 },
    ],
    RES_LOW_YIELD: [
        { text: "I sacrifice myself for the greater good.", weight: 10 },
        { text: "The mission comes first", weight: 5 },
        { text: "Efficiency compromised for the cause.", weight: 5 },
        { text: "I hope my family is safe.", weight: 1 },
        { text: "We have some food saved.", weight: 1 },
    ],
    RES_SUCCESS: [
        { text: "Today is a good day for the resistance.", weight: 10 },
        { text: "The signal is strong.", weight: 5 },
        { text: "Resistance secured", weight: 5 },
        { text: "The mission is complete.", weight: 5 },
        { text: "My family and the resistance are safe.", weight: 1 },
        { text: "My family will eat, and the resistance fights another day.", weight: 1 },
    ]
};

export const FLAVOR_COLORS: Record<FlavorKey, string> = {
    SOLVED: "text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] font-bold",
    DONE: "text-stone-500 italic",
    ADEQUATE: "text-stone-300 font-semibold",
    INITIAL: "text-stone-500",
    SUSPICIOUS: "text-red-400/90",
    SABOTAGE: "text-red-600 font-bold animate-pulse",
    // Resistance Colors
    RES_SACRIFICE_MISSION: "text-stone-400 italic", // Blending in (Grey)
    RES_AGENT_LOST: "text-red-500/80 font-mono", // Loss (Red-ish)
    RES_STATE_ESCAPED: "text-red-500 font-bold", // Danger (Red)
    RES_LOW_YIELD: "text-amber-600/80 italic", // Sacrifice (Amber-dim)
    RES_SUCCESS: "text-blue-400 font-bold drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]", // Victory (Blue)
};


