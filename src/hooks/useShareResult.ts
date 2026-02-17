import { useCallback } from 'react';
import { CardItem } from '../../types';
import { SystemMood } from './useSystemMood';
import { SHARE_FLAVOR_DATABASE } from '../config/shareFlavor';

interface UseShareResultProps {
    userScore: number;
    compliancePercentage: number;
    mood: SystemMood;
    items: CardItem[];
    resistanceStatusText?: string;
}

// Logic Exports (Pure)
export const getWeightedFlavor = (mood: SystemMood): string => {
    const entries = SHARE_FLAVOR_DATABASE[mood];
    if (!entries || entries.length === 0) return "Process Complete.";

    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let random = Math.random() * totalWeight;

    for (const entry of entries) {
        if (random < entry.weight) return entry.text;
        random -= entry.weight;
    }
    return entries[0].text;
};

export const formatSharePayload = (
    userScore: number,
    compliancePercentage: number,
    flavorText: string,
    date: string,
    resistanceStatusText?: string
): string => {
    const lines = [
        `THE GREAT SORT ${date}`
    ];

    if (resistanceStatusText) {
        lines.push(resistanceStatusText);
    }

    lines.push(`Citizen Yield: ${userScore}`);
    lines.push(`Compliance: ${compliancePercentage}%`);
    lines.push(``);
    lines.push(`"${flavorText}"`);
    lines.push(``);
    lines.push(`Play at stalinsort.fun`);

    return lines.join('\n');
};

export const useShareResult = () => {
    const generatePayload = useCallback(({ userScore, compliancePercentage, mood, items, date, resistanceStatusText }: UseShareResultProps & { date: string }) => {
        const flavorText = getWeightedFlavor(mood);
        return formatSharePayload(userScore, compliancePercentage, flavorText, date, resistanceStatusText);
    }, []);

    return { generatePayload };
};
