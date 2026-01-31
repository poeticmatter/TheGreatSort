import { ToolInstance, Move, GamePhase, CardItem } from '../../../types';

export const SCHEMA_VERSION = 1;

export interface SaveStateSchema {
    version: number;
    date: string;
    gameMode: string;
    puzzleId: number; // The initialization puzzle ID
    moves: Move[]; // The history of moves made

    // Snapshot data (Strictly optional, can be reconstructed from moves + seed if needed, 
    // but kept for faster load times or inspecting state)
    snapshot?: {
        list: CardItem[];
        tools: ToolInstance[];
        phase: GamePhase;
        levelScore: number;
    };
}

export interface CachedSolution {
    optimalScore: number;
    worstScore?: number;
}

export interface DailyResult {
    score: number;
    optimal?: number;
    date: string;
}

export type DailyHistory = Record<string, {
    date: string;
    highScore: number;
    attempts: number;
    lastPlayedAt: number;
}>;
