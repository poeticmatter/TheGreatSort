import { useMemo } from 'react';
import { FlavorKey } from '../config/flavorText';

export type SystemMood = Exclude<FlavorKey, 'IDLE'>;

// 100% - Done
// 95% and above - Acceptable
// 90% and above - Adequate
// Initial State (Normal) > CONCERNED > CRITICAL (Halfway to 0)

export const useSystemMood = (compliancePercentage: number, startingCompliance: number): SystemMood => {
    return useMemo(() => {
        if (compliancePercentage >= 100) return 'DONE';
        if (compliancePercentage >= 95) return 'ACCEPTABLE';
        if (compliancePercentage >= 90) return 'ADEQUATE';

        if (compliancePercentage >= startingCompliance) return 'NORMAL';

        // Range from 0 to StartingCompliance
        // "Below starting is Concern"
        // "Third of way to 0% is Suspicious" -> 2/3rds of Start remains
        // "Two thirds of way to 0% is Hostile" -> 1/3rd of Start remains

        const oneThird = startingCompliance / 3;
        const twoThirds = oneThird * 2;

        // Between Start and 2/3 Start
        if (compliancePercentage > twoThirds) return 'CONCERNED';

        // Between 2/3 Start and 1/3 Start
        if (compliancePercentage > oneThird) return 'SUSPICIOUS';

        // Below 1/3 Start
        return 'HOSTILE';
    }, [compliancePercentage, startingCompliance]);
};
