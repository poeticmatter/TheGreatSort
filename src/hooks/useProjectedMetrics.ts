import { useMemo } from 'react';
import { CardItem, ResistanceStatus } from '../../types';
import { gradeLevel, calculateBatchScore, calculateCompliance, verifyResistanceMission } from '../utils/gameLogic';

interface ProjectedMetrics {
    currentYield: number;
    startingYield: number;
    compliancePercentage: number;
    startingCompliance: number;
    yieldRatio: number;
    isZeroYield: boolean;
    projectedResistanceStatus: ResistanceStatus;
}

export const useProjectedMetrics = (
    currentList: CardItem[],
    initialList: CardItem[],
    optimalYield: number | null,
    worstYield: number | null
): ProjectedMetrics => {
    return useMemo(() => {
        // 1. Calculate Current Yield (sum of survivor values)
        // We need the GRADED list to check for agent survival
        const { score: currentYield, gradedList } = gradeLevel(currentList);

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

        // 6. Projected Resistance Status
        // We optimistically assume ACTIVE to check for failure conditions.
        // If no agents are present, it will return INACTIVE.
        // We use 0 as target yield for now (Resistance Mission Logic) or calculate typical target?
        // In daily puzzles, target varies. But for flavor text, "Success" vs "Careful" is less critical 
        // than "Exposed" vs "Compromised".
        // Let's assume targetYield is 0 for generic "Constraint Satisfaction" check.
        const projectedResistanceStatus = verifyResistanceMission(
            gradedList,
            ResistanceStatus.ACTIVE,
            currentList.length,
            startingYield,
            0
        );

        return {
            currentYield,
            startingYield,
            compliancePercentage,
            startingCompliance,
            yieldRatio,
            isZeroYield,
            projectedResistanceStatus
        };
    }, [currentList, initialList, optimalYield, worstYield]);
};
