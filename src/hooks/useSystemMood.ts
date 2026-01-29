import { useMemo } from 'react';

export type SystemMood = 'NORMAL' | 'CONCERNED' | 'HOSTILE' | 'CRITICAL';

interface MoodState {
    mood: SystemMood;
    moodText: string;
    moodColor: string; // Helper for UI color mapping
}

export const useSystemMood = (yieldRatio: number): MoodState => {
    return useMemo(() => {
        let mood: SystemMood = 'NORMAL';
        let moodText = "Productivity: Optimal";
        let moodColor = "text-amber-500"; // Default

        if (yieldRatio > 1.0) {
            mood = 'NORMAL';
            moodText = "Productivity: Optimal";
            moodColor = "text-amber-500";
        } else if (yieldRatio >= 0.8) {
            mood = 'CONCERNED';
            moodText = "Notice: Efficiency falling below baseline.";
            moodColor = "text-yellow-500";
        } else if (yieldRatio >= 0.5) {
            mood = 'HOSTILE';
            moodText = "Warning: Sabotage detected. Compliance mandatory.";
            moodColor = "text-orange-600";
        } else {
            mood = 'CRITICAL';
            moodText = "CRITICAL ERROR: ASSET LIQUIDATION IMMINENT.";
            moodColor = "text-red-600 animate-pulse";
        }

        return {
            mood,
            moodText,
            moodColor
        };
    }, [yieldRatio]);
};
