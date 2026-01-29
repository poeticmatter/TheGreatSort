import { useMemo } from 'react';

export type SystemMood = 'NORMAL' | 'CONCERNED' | 'HOSTILE' | 'CRITICAL';

interface MoodState {
    mood: SystemMood;
    // moodColor is still useful for UI color mapping, but text is moved.
    moodColor: string;
}

export const useSystemMood = (yieldRatio: number): MoodState => {
    return useMemo(() => {
        let mood: SystemMood = 'NORMAL';
        let moodColor = "text-amber-500"; // Default

        if (yieldRatio > 1.0) {
            mood = 'NORMAL';
            moodColor = "text-amber-500";
        } else if (yieldRatio >= 0.8) {
            mood = 'CONCERNED';
            moodColor = "text-yellow-500";
        } else if (yieldRatio >= 0.5) {
            mood = 'HOSTILE';
            moodColor = "text-orange-600";
        } else {
            mood = 'CRITICAL';
            moodColor = "text-red-600 animate-pulse";
        }

        return {
            mood,
            moodColor
        };
    }, [yieldRatio]);
};
