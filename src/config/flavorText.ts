export type FlavorKey = 'SOLVED' | 'DONE' | 'ADEQUATE' | 'INITIAL' | 'SUSPICIOUS' | 'SABOTAGE' | 'RES_SACRIFICE_MISSION' | 'RES_AGENT_LOST' | 'RES_STATE_ESCAPED' | 'RES_LOW_YIELD' | 'RES_SUCCESS';

export interface FlavorEntry {
    text: string;
    weight: number; // 1 = common, 0.1 = rare
}

export const FLAVOR_DATABASE: Record<FlavorKey, FlavorEntry[]> = {
    SOLVED: [
        { text: "Efficiency Absolute.", weight: 10 },
        { text: "Compliance: 100%.", weight: 10 },
        { text: "The System is perfect.", weight: 10 },
        { text: "Sorting complete.", weight: 10 },
        { text: "Process optimal.", weight: 10 },
        { text: "A glorious success.", weight: 1 },
        { text: "The Ministry approves.", weight: 1 },
        { text: "Perfection achieved.", weight: 1 },
        { text: "No deviation detected.", weight: 1 },
        { text: "Model efficiency.", weight: 1 },
    ],
    DONE: [
        { text: "Daily quota complete, comrade. Your duties lie with your family now, come back tomorrow for more work.", weight: 10 }
    ],
    ADEQUATE: [
        { text: "Acceptable deviation.", weight: 10 },
        { text: "Within limits.", weight: 10 },
        { text: "Compliance verified.", weight: 10 },
        { text: "Proceeding.", weight: 10 },
        { text: "Standard met.", weight: 10 },
        { text: "Notable effort.", weight: 1 },
        { text: "Deviation nominal.", weight: 1 },
        { text: "Good work, citizen.", weight: 1 },
        { text: "Tolerance maintained.", weight: 1 },
        { text: "Sufficient.", weight: 1 },
        { text: "Adequate output.", weight: 10 },
        { text: "Barely sufficient.", weight: 10 },
        { text: "Standards met.", weight: 10 },
        { text: "Working.", weight: 10 },
        { text: "Keep sorting.", weight: 10 },
        { text: "Room for improvement.", weight: 1 },
        { text: "Not terrible.", weight: 1 },
        { text: "Functional.", weight: 1 },
        { text: "Sustain pace.", weight: 1 },
        { text: "Bureaucracy is satisfied.", weight: 1 },
    ],
    INITIAL: [
        { text: "Systems nominal.", weight: 10 },
        { text: "Awaiting input.", weight: 10 },
        { text: "Routine operations.", weight: 10 },
        { text: "Processing...", weight: 10 },
        { text: "Status: Normal.", weight: 10 },
        { text: "Day 4239...", weight: 1 },
        { text: "The hum of the machine.", weight: 1 },
        { text: "Do not be distracted.", weight: 1 },
        { text: "Focus on the sort.", weight: 1 },
        { text: "Time flows.", weight: 1 },
    ],
    SUSPICIOUS: [
        { text: "Efficiency drop.", weight: 10 },
        { text: "Warning.", weight: 10 },
        { text: "Check your sorting.", weight: 10 },
        { text: "Drift detected.", weight: 10 },
        { text: "Focus.", weight: 10 },
        { text: "The Manager is watching.", weight: 1 },
        { text: "Irregularities found.", weight: 10 },
        { text: "Sorting error?", weight: 10 },
        { text: "Suspicious activity.", weight: 10 },
        { text: "Are you working?", weight: 10 },
        { text: "Questionable moves.", weight: 10 },
        { text: "Flagged for review.", weight: 1 },
        { text: "Who are you working for?", weight: 1 },
        { text: "Sabotage suspected.", weight: 1 },
        { text: "Inconsistent.", weight: 1 },
        { text: "We see you.", weight: 1 },
        { text: "Careful.", weight: 1 },
        { text: "Falling behind.", weight: 1 },
    ],
    SABOTAGE: [
        { text: "SABOTAGE!", weight: 10 },
        { text: "ERROR! ERROR!", weight: 10 },
        { text: "TERMINATION.", weight: 10 },
        { text: "COMPLY OR PERISH.", weight: 10 },
        { text: "STOP.", weight: 10 },
        { text: "THE STATE IS ANGRY.", weight: 1 },
        { text: "LIQUIDATION IMMINENT.", weight: 1 },
        { text: "YOU HAVE FAILED.", weight: 1 },
        { text: "TRAITOR.", weight: 1 },
        { text: "SYSTEM PURGE.", weight: 1 },
    ],
    // Resistance Mode Flavors
    RES_SACRIFICE_MISSION: [
        { text: "I sacrifice the mission to maintain appearances.", weight: 10 },
        { text: "Blending in requires total conformity.", weight: 5 },
        { text: "The data must flow perfectly to hide within it.", weight: 5 },
    ],
    RES_AGENT_LOST: [
        { text: "For the resistance, I will find the solution.", weight: 10 },
        { text: "We have lost a contact. Proceeding with mission.", weight: 5 },
        { text: "Silence on the secure channel.", weight: 5 },
    ],
    RES_STATE_ESCAPED: [
        { text: "The enemy is among us.", weight: 10 },
        { text: "Our grid is compromised.", weight: 5 },
        { text: "A shadow remains in the system.", weight: 5 },
    ],
    RES_LOW_YIELD: [
        { text: "I sacrifice myself for the greater good.", weight: 10 },
        { text: "Sometimes victory looks like failure.", weight: 5 },
        { text: "Efficiency compromised for the cause.", weight: 5 },
    ],
    RES_SUCCESS: [
        { text: "Today is a good day for the resistance.", weight: 10 },
        { text: "The signal is strong.", weight: 5 },
        { text: "Message received, loud and clear.", weight: 5 },
        { text: "Solidarity in the data stream.", weight: 5 },
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


