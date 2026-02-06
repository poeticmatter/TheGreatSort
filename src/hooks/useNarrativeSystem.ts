import { useMemo } from 'react';
import { ResistanceStatus } from '../../types';
import { FlavorKey, FLAVOR_DATABASE } from '../config/flavorText';
import { getResistanceFlavor } from '../utils/resistanceFlavor';

// Interface for the hook's input
interface NarrativeSystemProps {
    compliancePercentage: number;
    resistanceStatus?: ResistanceStatus;
    projectedResistanceStatus?: ResistanceStatus; // "effective" status from projection
    mood: FlavorKey;
    daySeed?: number; // For deterministic text selection
}

// Interface for the hook's output
interface NarrativeResult {
    text: string;
    mood: FlavorKey;
}

/**
 * useNarrativeSystem
 * 
 * Centralizes all logic for determining which flavor text to display.
 * Handles:
 * 1. Priority logic (Resistance > Standard)
 * 2. Effective Status calculation (Projected vs Actual)
 * 3. Text selection and deterministic randomization
 */
export const useNarrativeSystem = ({
    compliancePercentage,
    resistanceStatus = ResistanceStatus.INACTIVE,
    projectedResistanceStatus,
    mood,
    daySeed = 0
}: NarrativeSystemProps): NarrativeResult => {

    return useMemo(() => {
        // [LOGIC 1] Determine Effective Status
        // Use LIVE projected status if available, otherwise fall back to persistent status.
        // If neither is "active" (i.e. undefined or INACTIVE), it defaults to INACTIVE logic downstream.
        const effectiveStatus = projectedResistanceStatus ?? resistanceStatus;
        const isResistanceActive = resistanceStatus !== ResistanceStatus.INACTIVE;

        // [LOGIC 2] Determine Flavor Key
        // If resistance is active (joined), we check for resistance-specific flavor.
        // Otherwise, we default to null, which falls back to the standard mood.
        let targetFlavorKey: FlavorKey | null = null;

        if (isResistanceActive) {
            targetFlavorKey = getResistanceFlavor(compliancePercentage, effectiveStatus);
        }

        // [LOGIC 3] Select Text
        // If we have a specific resistance key, use it.
        if (targetFlavorKey) {
            const entries = FLAVOR_DATABASE[targetFlavorKey];
            if (entries && entries.length > 0) {
                // Deterministic pick based on seed + key length
                // This ensures rotation but stability for the same day/state
                const seedNoise = targetFlavorKey.length;
                const selectionSeed = Math.abs((daySeed || 0) + seedNoise);
                const index = selectionSeed % entries.length;

                return {
                    text: entries[index].text,
                    mood: targetFlavorKey
                };
            }
        }

        // [FALLBACK] Standard Flavor
        // If no resistance flavor (or empty DB), use the standard mood.
        // Note: The original code used `state.flavorMap[state.mood]`. 
        // Ideally we should pass the full map or accces DB. 
        // Assuming FLAVOR_DATABASE also contains standard keys (INITIAL, ADEQUATE etc.)
        // verification: FLAVOR_DATABASE usually has keys like 'INITIAL', 'ADEQUATE'.
        // If the original used `state.flavorMap`, that was likely a pre-selected string map from the daily config.
        // However, looking at codebase conventions, FLAVOR_DATABASE is the source.
        // We will try to fetch from FLAVOR_DATABASE using the mood key.
        const standardEntries = FLAVOR_DATABASE[mood];
        let standardText = "";

        if (standardEntries && standardEntries.length > 0) {
            const safeSeed = Math.abs(daySeed || 0);
            const index = safeSeed % standardEntries.length;
            standardText = standardEntries[index]?.text ?? "...";
        } else {
            // Fallback if mood not in DB or empty (shouldn't happen with valid config)
            standardText = "...";
        }

        return {
            text: standardText,
            mood: mood
        };

    }, [compliancePercentage, resistanceStatus, projectedResistanceStatus, mood, daySeed]);
};
