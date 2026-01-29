export type FlavorKey = 'DONE' | 'ACCEPTABLE' | 'ADEQUATE' | 'NORMAL' | 'CONCERNED' | 'HOSTILE' | 'SUSPICIOUS';

export interface FlavorEntry {
    text: string;
    weight: number; // 1 = common, 0.1 = rare
}

export const FLAVOR_DATABASE: Record<FlavorKey, FlavorEntry[]> = {
    DONE: [
        { text: "DONE", weight: 1.0 },
        { text: "DONE", weight: 0.8 },
        { text: "DONE", weight: 0.8 },
    ],
    ACCEPTABLE: [
        { text: "ACCEPTABLE", weight: 1.0 },
        { text: "ACCEPTABLE", weight: 0.8 },
        { text: "ACCEPTABLE", weight: 0.8 },
    ],
    ADEQUATE: [
        { text: "ADEQUATE", weight: 1.0 },
        { text: "ADEQUATE", weight: 0.8 },
        { text: "ADEQUATE", weight: 0.5 },
    ],
    NORMAL: [
        { text: "NORMAL", weight: 1.0 },
        { text: "NORMAL", weight: 0.5 },
        { text: "NORMAL", weight: 0.5 },
        { text: "NORMAL", weight: 0.8 },
    ],
    CONCERNED: [
        { text: "CONCERNED", weight: 1.0 },
        { text: "CONCERNED", weight: 0.5 },
        { text: "CONCERNED", weight: 0.5 },
        { text: "CONCERNED", weight: 0.8 },
    ],
    HOSTILE: [
        { text: "HOSTILE", weight: 1.0 },
        { text: "HOSTILE", weight: 0.8 },
        { text: "HOSTILE", weight: 0.8 },
        { text: "HOSTILE", weight: 0.5 },
    ],
    SUSPICIOUS: [
        { text: "SUSPICIOUS", weight: 1.0 },
        { text: "SUSPICIOUS", weight: 0.8 },
        { text: "SUSPICIOUS", weight: 0.8 },
        { text: "SUSPICIOUS", weight: 0.5 },
    ]
};

export const FLAVOR_COLORS: Record<FlavorKey, string> = {
    DONE: "text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] font-bold",
    ACCEPTABLE: "text-amber-400 font-semibold",
    ADEQUATE: "text-amber-500/90",
    NORMAL: "text-stone-500",
    CONCERNED: "text-red-400/90",
    SUSPICIOUS: "text-red-500 font-semibold",
    HOSTILE: "text-red-600 font-bold animate-pulse"
};
