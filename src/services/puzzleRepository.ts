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

import { decodePuzzleId } from '../utils/obfuscationUtils';

// Use local time construction: new Date(year, monthIndex, day)
// January is 0. 2026-03-19 Local Time.
export const EPOCH_START = new Date(2026, 2, 19);

export const PuzzleRepository = {
    getIndexForDate(date: Date): number {
        const start = new Date(EPOCH_START);
        start.setHours(0, 0, 0, 0);

        const current = new Date(date);
        current.setHours(0, 0, 0, 0);

        const diffTime = current.getTime() - start.getTime();
        let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            diffDays = 0;
        }
        return diffDays;
    },

    getDateForIndex(index: number): Date {
        const date = new Date(EPOCH_START);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + index);
        return date;
    },

    getDailyPuzzle(date: Date): DailyPuzzleData {
        const index = this.getIndexForDate(date);
        const puzzleCount = dailyPuzzles.length;
        const puzzleIndex = index % puzzleCount;

        return dailyPuzzles[puzzleIndex] as unknown as DailyPuzzleData;
    },

    resolveObfuscatedPuzzle(obfuscatedId: string): { date: Date, data: DailyPuzzleData } | null {
        const index = decodePuzzleId(obfuscatedId);

        if (isNaN(index) || index < 0) {
            return null;
        }

        const todayIndex = this.getIndexForDate(new Date());

        if (index > todayIndex) {
            return null; // Future puzzles are not allowed
        }

        const date = this.getDateForIndex(index);
        const data = this.getDailyPuzzle(date);

        return { date, data };
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
