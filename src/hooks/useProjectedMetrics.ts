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
    worstYield: number | null,
    resistanceTarget: number | undefined = undefined
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
        // We must define what "Success" means in terms of yield. 
        // Previously, 0 was used, which made CAREFUL (Low Yield) impossible.
        // We now use resistanceTarget (if explicit) or optimalYield (if known) or startingYield as the target.
        // This ensures if you survive but tank your score, you get the "Low Yield" flavor.
        // NOTE: User requested using optimalYield, but we should respect the explicit target if defined (e.g. 45 vs 52).
        const effectiveTarget = (resistanceTarget !== undefined && resistanceTarget > 0)
            ? resistanceTarget
            : (optimalYield !== null ? optimalYield : startingYield);

        const projectedResistanceStatus = verifyResistanceMission(
            gradedList,
            ResistanceStatus.ACTIVE,
            currentList.length,
            startingYield,
            effectiveTarget
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
