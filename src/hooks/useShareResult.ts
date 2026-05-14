import { useCallback } from 'react';
import { CardItem, ToolType } from '../../types';
import { SystemMood } from './useSystemMood';
import { SHARE_FLAVOR_DATABASE } from '../config/shareFlavor';
import { TOOL_EMOJIS } from '../config/toolEmojis';
import { encodePuzzleId } from '../utils/obfuscationUtils';
import { PuzzleRepository } from '../services/puzzleRepository';
import { BASE_URL } from '../constants';

interface UseShareResultProps {
    userScore: number;
    compliancePercentage: number;
    mood: SystemMood;
    initialList: CardItem[];
    initialTools: ToolType[];
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
    initialList: CardItem[],
    initialTools: ToolType[],
    permalinkUrl: string,
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

    const toolsLine = initialTools.map(t => TOOL_EMOJIS[t] || '🔧').join(' ');
    lines.push(`Tools: ${toolsLine}`);

    const boardLine = initialList.map(item => `[${item.val}]`).join(' ');
    lines.push(`Board: ${boardLine}`);

    lines.push(``);
    lines.push(`"${flavorText}"`);
    lines.push(``);

    lines.push(`Audit this sequence: ${permalinkUrl}`);

    return lines.join('\n');
};

export const useShareResult = () => {
    const generatePayload = useCallback(({ userScore, compliancePercentage, mood, initialList, initialTools, date, resistanceStatusText }: UseShareResultProps & { date: string }) => {
        const flavorText = getWeightedFlavor(mood);

        const puzzleDateParts = date.split('-');
        const puzzleDate = new Date(parseInt(puzzleDateParts[0]), parseInt(puzzleDateParts[1]) - 1, parseInt(puzzleDateParts[2]));
        const index = PuzzleRepository.getIndexForDate(puzzleDate);
        const obfuscatedId = encodePuzzleId(index);

        const origin = typeof window !== 'undefined' ? window.location.origin : BASE_URL;
        const permalinkUrl = `${origin}/?p=${obfuscatedId}`;

        return formatSharePayload(userScore, compliancePercentage, flavorText, date, initialList, initialTools, permalinkUrl, resistanceStatusText);
    }, []);

    return { generatePayload };
};
