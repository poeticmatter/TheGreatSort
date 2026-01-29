import { useMemo } from 'react';
import { FlavorKey } from '../config/flavorText';

export type SystemMood = Exclude<FlavorKey, 'IDLE'>;

export const useSystemMood = (yieldRatio: number): SystemMood => {
    return useMemo(() => {
        let mood: SystemMood = 'NORMAL';

        if (yieldRatio > 1.0) {
            mood = 'NORMAL';
        } else if (yieldRatio >= 0.8) {
            mood = 'CONCERNED';
        } else if (yieldRatio >= 0.5) {
            mood = 'HOSTILE';
        } else {
            mood = 'CRITICAL';
        }

        return mood;
    }, [yieldRatio]);
};
