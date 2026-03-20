import dailyPuzzles from '../data/daily_puzzles.json';
import { CardItem, ToolInstance, ToolType, AgentRole } from '../../types';

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
    resistanceData: {
        agents: Record<number, 'resistance' | 'state'>;
        targetYield: number;
    };
}

// Use local time construction: new Date(year, monthIndex, day)
// January is 0. 2026-03-19 Local Time.
const EPOCH_START = new Date(2026, 2, 19);

export const PuzzleRepository = {
    getDailyPuzzle(date: Date): DailyPuzzleData {
        // Normalize dates to midnight LOCAL time and use rounding to handle DST shifts
        const start = new Date(EPOCH_START);
        start.setHours(0, 0, 0, 0);

        const current = new Date(date);
        current.setHours(0, 0, 0, 0);

        const diffTime = current.getTime() - start.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // Handle days before epoch or negative diffs safely (though unlikely in prod)
        let index = diffDays;
        if (index < 0) {
            index = 0;
        }

        const puzzleCount = dailyPuzzles.length;
        const puzzleIndex = index % puzzleCount;

        return dailyPuzzles[puzzleIndex] as unknown as DailyPuzzleData;
    },

    hydrateSequence(sequence: number[]): CardItem[] {
        return sequence.map((val, index) => ({
            id: `daily-${index}`,
            val: val,
            status: 'pending',
            hasShield: false, // Default to false as simple numbers don't imply shields
            role: AgentRole.NONE
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
