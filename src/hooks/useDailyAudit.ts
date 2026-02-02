import { useState, useEffect, useMemo } from 'react';
import { PuzzleRepository } from '../services/puzzleRepository';
import { CardItem, Move, ToolType } from '../../types';
import { applyMove, Solution } from '../utils/gameLogic';
import { PersistenceService } from '../services/persistence';

export interface TimelineStep {
    list: CardItem[];
    move: Move | null;
}

interface DailyAuditStats {
    userScore: number;
    optimalScore: number;
    worstScore: number;
    resistanceStatus?: string;
}

export interface UseDailyAuditResult {
    loading: boolean;
    error: string | null;
    initialList: CardItem[];
    solution: Solution | null;
    timeline: TimelineStep[];
    stats: DailyAuditStats;
}

const VALID_TOOLS: Set<string> = new Set([
    'demote', 'swap', 'purge', 'promote', 'longswap',
    'merge', 'sink', 'halve', 'shield', 'shrink',
    'hop', 'mirror', 'cycle', 'equalize'
]);

function isToolType(tool: string): tool is ToolType {
    return VALID_TOOLS.has(tool);
}

export const useDailyAudit = (date: string, userHighScore: number): UseDailyAuditResult => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [solution, setSolution] = useState<Solution | null>(null);
    const [worstScore, setWorstScore] = useState<number>(0);
    const [initialList, setInitialList] = useState<CardItem[]>([]);
    const [resistanceStatus, setResistanceStatus] = useState<string | undefined>(undefined);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);

        // Short timeout to allow UI to mount before "heavy" work and simulate audit feel
        const timer = setTimeout(() => {
            if (!mounted) return;

            try {
                // Parse date string (YYYY-MM-DD or similar) as Local Time
                const [y, m, d] = date.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);

                const puzzle = PuzzleRepository.getDailyPuzzle(dateObj);

                // Fetch Persisted Result for Resistance Status
                const persistedResult = PersistenceService.getDailyResult(date);
                if (persistedResult?.resistanceStatus) {
                    setResistanceStatus(persistedResult.resistanceStatus);
                }

                // Hydrate Initial List
                const list = PuzzleRepository.hydrateSequence(puzzle.sequence);
                setInitialList(list);

                // ... (rest is same)

                // Set Scores
                setWorstScore(puzzle.targets.min);

                // Map Solution
                // Strict validation of tool types
                const mappedMoves: Move[] = puzzle.solution.map((step, idx) => {
                    if (!isToolType(step.tool)) {
                        console.warn(`Invalid tool type found in solution at index ${idx}: ${step.tool}. Defaulting to 'swap' to prevent crash, but this indicates a data integrity issue.`);
                        return {
                            tool: 'swap', // Fallback
                            index: step.i,
                            targetIndex: step.t,
                            description: `INVALID TOOL ${step.tool} at ${step.i}`
                        };
                    }

                    return {
                        tool: step.tool,
                        index: step.i,
                        targetIndex: step.t,
                        description: `Use ${step.tool} at ${step.i}`
                    };
                });

                const sol: Solution = {
                    score: puzzle.targets.max,
                    moves: mappedMoves
                };

                setSolution(sol);
            } catch (e) {
                console.error("Failed to load daily audit:", e);
                setError("Failed to load audit data.");
            } finally {
                setLoading(false);
            }
        }, 50);

        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, [date]);

    // Derive Timeline (Keep same)
    const timeline = useMemo(() => {
        if (!solution || initialList.length === 0) return [];

        const steps: TimelineStep[] = [];
        let currentList = initialList.map(i => ({ ...i })); // Deep copy to start

        // Loop through moves
        for (let i = 0; i < solution.moves.length; i++) {
            const move = solution.moves[i];
            steps.push({
                list: currentList,
                move: move
            });

            // Apply move to get next state
            currentList = applyMove(currentList, move.tool, move.index, move.targetIndex);
        }

        // Final Result State
        steps.push({
            list: currentList,
            move: null
        });

        return steps;
    }, [solution, initialList]);

    return {
        loading,
        error,
        initialList,
        solution,
        timeline,
        stats: {
            userScore: userHighScore,
            optimalScore: solution ? solution.score : 0,
            worstScore,
            resistanceStatus
        }
    };
};
