import dailyPuzzles from '../data/daily_puzzles.json';
import { CardItem, ToolInstance, ToolType } from '../../types';

export interface DailyPuzzleData {
    id: number;
    sequence: number[];
    tools: string[];
    targets: {
        min: number;
        max: number;
    };
    solution: {
        tool: string;
        i: number;
        t?: number;
    }[];
}

const EPOCH_START = new Date('2026-01-01T00:00:00Z');

export const PuzzleRepository = {
    getDailyPuzzle(date: Date): DailyPuzzleData {
        // Normalize dates to midnight UTC to ensure consistent day calculation
        const start = new Date(EPOCH_START);
        start.setUTCHours(0, 0, 0, 0);

        const current = new Date(date);
        current.setUTCHours(0, 0, 0, 0);

        const diffTime = current.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Handle days before epoch or negative diffs safely (though unlikely in prod)
        let index = diffDays;
        if (index < 0) {
            index = 0;
        }

        const puzzleCount = dailyPuzzles.length;
        const puzzleIndex = index % puzzleCount;

        return dailyPuzzles[puzzleIndex] as DailyPuzzleData;
    },

    hydrateSequence(sequence: number[]): CardItem[] {
        return sequence.map((val, index) => ({
            id: `daily-${index}`,
            val: val,
            status: 'pending',
            linkScore: null,
            hasShield: false // Default to false as simple numbers don't imply shields
        }));
    },

    hydrateTools(toolNames: string[]): ToolInstance[] {
        return toolNames.map((name, index) => ({
            instanceId: `tool-${index}-${name}`,
            type: name as ToolType,
            used: false
        }));
    }
};
