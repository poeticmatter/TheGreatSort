import { useMemo } from 'react';
import { CardItem } from '../../types';
import { gradeLevel, calculateBatchScore, calculateCompliance } from '../utils/gameLogic';

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
        const compliancePercentage = calculateCompliance(currentYield, optimalYield, worstYield);

        // Calculate start compliance
        const startingCompliance = calculateCompliance(startingYield, optimalYield, worstYield);



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
