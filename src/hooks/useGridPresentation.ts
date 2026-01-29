import { useMemo } from 'react';
import { CardItem, ToolType } from '../../types';

export interface RenderableCard extends CardItem {
    key: string; // Unique key for React
    isSelected: boolean;
    isCandidate: boolean;
    isDisabled: boolean;
    mirrorLabel: string | null;
    // Layout specific props might still be calculated in the view or here.
    // Let's include mobileDirection here if we want to be thorough, but the grid manages the grid index.
}

interface UseGridPresentationProps {
    sequence: CardItem[];
    highlightIndices: number[];
    selectedIndex: number | null;
    candidateIndices: number[];
    disabledIndices: number[];
    selectedTool: ToolType | null;
}

const getRoman = (n: number): string => {
    const numerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
    return numerals[n] || n.toString();
};

export const useGridPresentation = ({
    sequence,
    highlightIndices,
    selectedIndex,
    candidateIndices,
    disabledIndices,
    selectedTool
}: UseGridPresentationProps): RenderableCard[] => {

    return useMemo(() => {
        return sequence.map((item, idx) => {
            const isSelected = (selectedIndex === idx) || highlightIndices.includes(idx);
            const isCandidate = candidateIndices.includes(idx);
            const isDisabled = disabledIndices.includes(idx);

            // --- Mirror Symbology Logic ---
            let mirrorLabel: string | null = null;
            if (selectedTool === 'mirror') {
                const len = sequence.length;
                const partnerIndex = len - 1 - idx;
                if (partnerIndex !== idx) {
                    // Pair ID is 1-based index of the pair
                    const pairId = Math.min(idx, partnerIndex) + 1;
                    mirrorLabel = getRoman(pairId);
                }
            }

            return {
                ...item,
                key: item.id || `card-${idx}`, // Fallback if id missing, though it shouldn't be
                isSelected,
                isCandidate,
                isDisabled,
                mirrorLabel
            };
        });
    }, [sequence, highlightIndices, selectedIndex, candidateIndices, disabledIndices, selectedTool]);
};
