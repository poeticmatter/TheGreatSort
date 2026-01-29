import { useMemo } from 'react';
import { CardItem } from '../../types';
import { gradeLevel, calculateBatchScore } from '../utils/gameLogic';

interface ProjectedMetrics {
    currentScore: number;
    startingScore: number;
    compliancePercentage: number;
    yieldRatio: number;
    isZeroYield: boolean;
}

export const useProjectedMetrics = (
    currentList: CardItem[],
    initialList: CardItem[],
    optimalScore: number | null
): ProjectedMetrics => {
    return useMemo(() => {
        // 1. Calculate Current Score
        // gradeLevel returns { score, gradedList }. We only need score here.
        const { score: currentScore } = gradeLevel(currentList);

        // 2. Calculate Starting Score (Baseline)
        // We use calculateBatchScore on the initialList directly (Optimization: No regeneration)
        const startingScore = calculateBatchScore(initialList);

        // 3. Compliance Percentage (Current vs Optimal)
        // Avoid division by zero if optimalScore is null or 0.
        let compliancePercentage = 0;
        if (optimalScore && optimalScore > 0) {
            compliancePercentage = Math.round((currentScore / optimalScore) * 100);
        }
        // Cap at 100 visually (logic might allow >100 if user beats "optimal", but UI likely wants 0-100)
        // The requirement says "Cap at 100 visually". We'll cap the number here for simplicity.
        compliancePercentage = Math.min(100, Math.max(0, compliancePercentage));

        // 4. Yield Ratio (Current vs Starting)
        // Avoid division by zero
        let yieldRatio = 0;
        if (startingScore > 0) {
            yieldRatio = currentScore / startingScore;
        } else if (currentScore > 0) {
            // If starting score was 0 (unlikely but possible), and current is >0, ratio is infinite? 
            // Let's safe-guard to 1.0 or high number.
            yieldRatio = 1.0;
        }

        // 5. Zero Yield Flag
        const isZeroYield = currentScore === 0 && currentList.length > 0;

        return {
            currentScore,
            startingScore,
            compliancePercentage,
            yieldRatio,
            isZeroYield
        };
    }, [currentList, initialList, optimalScore]);
};
