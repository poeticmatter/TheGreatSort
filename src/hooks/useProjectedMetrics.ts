import { useMemo } from 'react';
import { CardItem } from '../../types';
import { gradeLevel, calculateBatchScore } from '../utils/gameLogic';

interface ProjectedMetrics {
    currentYield: number;
    startingYield: number;
    compliancePercentage: number;
    startingCompliance: number;
    yieldRatio: number;
    isZeroYield: boolean;
}

export const useProjectedMetrics = (
    currentList: CardItem[],
    initialList: CardItem[],
    optimalYield: number | null,
    worstYield: number | null
): ProjectedMetrics => {
    return useMemo(() => {
        // 1. Calculate Current Yield (sum of survivor values)
        const { score: currentYield } = gradeLevel(currentList);

        // 2. Calculate Starting Yield (Baseline)
        const startingYield = calculateBatchScore(initialList);

        // 3. Compliance Percentage (Current vs Optimal/Worst)
        let compliancePercentage = 0;
        let startingCompliance = 0;

        if (optimalYield !== null && worstYield !== null && optimalYield > worstYield) {
            // Standard Range Calculation
            const range = optimalYield - worstYield;

            const currentProgress = currentYield - worstYield;
            compliancePercentage = Math.round((currentProgress / range) * 100);

            const startProgress = startingYield - worstYield;
            startingCompliance = Math.round((startProgress / range) * 100);

        } else if (optimalYield && optimalYield > 0) {
            // Fallback
            compliancePercentage = Math.round((currentYield / optimalYield) * 100);
            startingCompliance = Math.round((startingYield / optimalYield) * 100);
        }

        // Cap visually
        compliancePercentage = Math.min(100, Math.max(0, compliancePercentage));
        startingCompliance = Math.min(100, Math.max(0, startingCompliance));

        // 4. Yield Ratio (Current vs Starting)
        let yieldRatio = 0;
        if (startingYield > 0) {
            yieldRatio = currentYield / startingYield;
        } else if (currentYield > 0) {
            yieldRatio = 1.0;
        }

        // 5. Zero Yield Flag
        const isZeroYield = currentYield === 0 && currentList.length > 0;

        return {
            currentYield,
            startingYield,
            compliancePercentage,
            startingCompliance,
            yieldRatio,
            isZeroYield
        };
    }, [currentList, initialList, optimalYield, worstYield]);
};
