import { useMemo } from 'react';
import { CardItem } from '../../types';
import { gradeLevel, calculateBatchScore } from '../utils/gameLogic';

interface ProjectedMetrics {
    currentScore: number;
    startingScore: number;
    compliancePercentage: number;
    startingCompliance: number;
    yieldRatio: number;
    isZeroYield: boolean;
}

export const useProjectedMetrics = (
    currentList: CardItem[],
    initialList: CardItem[],
    optimalScore: number | null,
    worstScore: number | null
): ProjectedMetrics => {
    return useMemo(() => {
        // 1. Calculate Current Score
        // gradeLevel returns { score, gradedList }. We only need score here.
        const { score: currentScore } = gradeLevel(currentList);

        // 2. Calculate Starting Score (Baseline)
        // We use calculateBatchScore on the initialList directly (Optimization: No regeneration)
        const startingScore = calculateBatchScore(initialList);

        // 3. Compliance Percentage (Current vs Optimal/Worst)
        let compliancePercentage = 0;
        let startingCompliance = 0;

        if (optimalScore !== null && worstScore !== null && optimalScore > worstScore) {
            // Standard Range Calculation
            const range = optimalScore - worstScore;

            const currentProgress = currentScore - worstScore;
            compliancePercentage = Math.round((currentProgress / range) * 100);

            const startProgress = startingScore - worstScore;
            startingCompliance = Math.round((startProgress / range) * 100);

        } else if (optimalScore && optimalScore > 0) {
            // Fallback
            compliancePercentage = Math.round((currentScore / optimalScore) * 100);
            startingCompliance = Math.round((startingScore / optimalScore) * 100);
        }

        // Cap visually
        compliancePercentage = Math.min(100, Math.max(0, compliancePercentage));
        startingCompliance = Math.min(100, Math.max(0, startingCompliance));

        // 4. Yield Ratio (Current vs Starting)
        let yieldRatio = 0;
        if (startingScore > 0) {
            yieldRatio = currentScore / startingScore;
        } else if (currentScore > 0) {
            yieldRatio = 1.0;
        }

        // 5. Zero Yield Flag
        const isZeroYield = currentScore === 0 && currentList.length > 0;

        return {
            currentScore,
            startingScore,
            compliancePercentage,
            startingCompliance,
            yieldRatio,
            isZeroYield
        };
    }, [currentList, initialList, optimalScore, worstScore]);
};
