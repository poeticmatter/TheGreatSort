import { useCallback } from 'react';
import { CardItem } from '../../types';
import { SystemMood } from './useSystemMood';
import { SHARE_FLAVOR_DATABASE } from '../config/shareFlavor';

interface UseShareResultProps {
    userScore: number;
    compliancePercentage: number;
    mood: SystemMood;
    items: CardItem[];
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

export const generateEmojiGrid = (items: CardItem[]): string => {
    return items.map(item => {
        if (item.status === 'eliminated') {
            return '🟥';
        }
        return '🟨';
    }).join('');
};

export const formatSharePayload = (
    userScore: number,
    compliancePercentage: number,
    flavorText: string,
    emojiGrid: string,
    date: string
): string => {
    return [
        `THE GREAT SORT ${date}`,
        `Citizen Yield: ${userScore}`,
        `Compliance: ${compliancePercentage}%`,
        ``,
        `"${flavorText}"`,
        ``,
        emojiGrid,
        ``,
        `Play at stalinsort.fun`
    ].join('\n');
};

export const useShareResult = () => {
    const generatePayload = useCallback(({ userScore, compliancePercentage, mood, items, date }: UseShareResultProps & { date: string }) => {
        const flavorText = getWeightedFlavor(mood);
        const emojiGrid = generateEmojiGrid(items);
        return formatSharePayload(userScore, compliancePercentage, flavorText, emojiGrid, date);
    }, []);

    return { generatePayload };
};
