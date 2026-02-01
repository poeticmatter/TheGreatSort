import { useMemo } from 'react';
import { FlavorKey } from '../config/flavorText';

export type SystemMood = Exclude<FlavorKey, 'IDLE'>;

// Hierarchical Yield System
// 1. DONE (Day Completed)
// 2. SOLVED (100% Compliance)
// 3. ADEQUATE (> Starting Compliance)
// 4. INITIAL (= Starting Compliance)
// 5. SUSPICIOUS (> 0% but < Starting Compliance)
// 6. SABOTAGE (0% or less)

export const useSystemMood = (compliancePercentage: number, startingCompliance: number, isDailyCompleted: boolean): SystemMood => {
    return useMemo(() => {
        if (isDailyCompleted) return 'DONE';

        // Tier 1: Perfection
        if (compliancePercentage >= 100) return 'SOLVED';

        const epsilon = 0.01;

        // Tier 3: Neutral/Initial State
        // Check this before Adequate to handle the exact equality case correctly
        if (Math.abs(compliancePercentage - startingCompliance) < epsilon) {
            return 'INITIAL';
        }

        // Tier 2: Improvement
        if (compliancePercentage > startingCompliance) return 'ADEQUATE';

        // Tier 4: Suspicion
        if (compliancePercentage > 0) return 'SUSPICIOUS';

        // Tier 5: Failure
        return 'SABOTAGE';
    }, [compliancePercentage, startingCompliance, isDailyCompleted]);
};
