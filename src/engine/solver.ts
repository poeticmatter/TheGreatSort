import { calculateBatchScore } from './grading.ts';
import { TOOL_REGISTRY } from './tools/index.ts';
import { ISortable, ToolType } from './types.ts';

export interface SolverItem extends ISortable { }

export interface DailyPuzzleMove {
    tool: ToolType;
    i: number;
    t?: number;
}

export interface AlternativeSolution {
    score: number;
    state: number[]; // Values
    moves: DailyPuzzleMove[];
}

export interface SolverResult {
    maxYield: number;
    distinctSolvedStates: number;
    minSolutionDepth: number;
    bestState: number[];
    bestSolution: DailyPuzzleMove[];
    computationalComplexity: number;
    allSolutions?: AlternativeSolution[];
}

/**
 * Core Solver Function
 * Finds the optimal solution and metrics.
 */
export function solve(
    initialSequence: ISortable[],
    initialTools: ToolType[],
    objective: 'MAX' | 'MIN' = 'MAX',
    options?: { findAll?: boolean; threshold?: number; minDepth?: number; maxDepth?: number }
): SolverResult {
    let globalBestScore = objective === 'MAX' ? -Infinity : Infinity;

    // Map<stateString, DailyPuzzleMove[]>
    // Stores the shortest path to reach a specific state that achieves globalBestScore
    let bestSolutionsMap = new Map<string, DailyPuzzleMove[]>();

    // For 'findAll' mode
    let allSolutions: AlternativeSolution[] = [];
    const visitedStatesForSolutions = new Set<string>(); // To avoid duplicates in allSolutions if needed?
    // Actually, we want alternative *paths*? Or just alternative *outcomes*?
    // Delta Algo: "Find Alternative Solution... Yield > InitialYield... KeptIndices != StateSet"
    // We probably want unique OUTCOMES (final states).

    let nodesVisited = 0;

    function search(currentSeq: ISortable[], currentTools: ToolType[], currentPath: DailyPuzzleMove[]) {
        nodesVisited++;

        // Pruning Rule: Discard branch if negative (unless game allows)
        // REMOVED: Pruning negative values prevents valid strategies involving temporary sacrifices (e.g. Transfer -> Equalize)
        // if (currentSeq.some(s => s.val < 0)) {
        //    return;
        // }

        // Pruning Rule: Exceeds maximum depth
        if (options?.maxDepth !== undefined && currentPath.length > options.maxDepth) {
            return;
        }

        const score = calculateBatchScore(currentSeq);
        // Include hasShield in state key as it dramatically affects future scoring potential
        const stateValString = JSON.stringify(currentSeq.map(s => `${s.val}:${s.hasShield ? 1 : 0}`));

        // Logic: Update globalBestScore and Map
        const isImprovement = objective === 'MAX' ? score > globalBestScore : score < globalBestScore;
        const isEqual = score === globalBestScore;

        if (isImprovement) {
            globalBestScore = score;
            bestSolutionsMap.clear();
            bestSolutionsMap.set(stateValString, [...currentPath]);
        } else if (isEqual) {
            // If New State: Add it.
            // If Existing State: Keep shorter path.
            if (bestSolutionsMap.has(stateValString)) {
                const existingPath = bestSolutionsMap.get(stateValString)!;
                if (currentPath.length < existingPath.length) {
                    bestSolutionsMap.set(stateValString, [...currentPath]);
                }
            } else {
                bestSolutionsMap.set(stateValString, [...currentPath]);
            }
        }

        // Capture Alternative Logic
        if (options?.findAll) {
            const meetsMinDepth = options.minDepth === undefined || currentPath.length >= options.minDepth;

            if (meetsMinDepth && options.threshold !== undefined) {
                if (score > options.threshold) {
                    if (!visitedStatesForSolutions.has(stateValString)) {
                        visitedStatesForSolutions.add(stateValString);
                        allSolutions.push({
                            score,
                            state: JSON.parse(stateValString),
                            moves: [...currentPath]
                        });
                    }
                }
            }
        }

        if (currentTools.length === 0) return;

        // Optimization: Only iterate over UNIQUE available tool types.
        const uniqueTypes = Array.from(new Set(currentTools));

        for (const toolType of uniqueTypes) {
            // Consume one instance of this tool
            const idx = currentTools.indexOf(toolType);
            const nextTools = [...currentTools];
            nextTools.splice(idx, 1);

            const strategy = TOOL_REGISTRY[toolType];
            if (!strategy) continue;

            const moves = strategy.generateMoves(currentSeq);

            for (const move of moves) {
                // Apply the move
                const nextSeq = strategy.apply(currentSeq, move.index, move.targetIndex);

                // Prune NOOP moves
                let isNoop = true;
                if (currentSeq.length !== nextSeq.length) {
                    isNoop = false;
                } else {
                    for (let i = 0; i < currentSeq.length; i++) {
                        if (currentSeq[i].val !== nextSeq[i].val || currentSeq[i].hasShield !== nextSeq[i].hasShield) {
                            isNoop = false;
                            break;
                        }
                    }
                }

                if (isNoop) continue;

                // Construct the Move Object
                const moveObj: DailyPuzzleMove = {
                    tool: toolType,
                    i: move.index
                };
                if (move.targetIndex !== undefined) {
                    moveObj.t = move.targetIndex;
                }

                search(nextSeq as ISortable[], nextTools, [...currentPath, moveObj]);
            }
        }
    }

    search(initialSequence, initialTools, []);

    // Select the best solution (Shortest Path) among the best states
    let minSolutionDepth = Infinity;
    let bestState: number[] = [];
    let bestSolution: DailyPuzzleMove[] = [];

    for (const [stateStr, moves] of bestSolutionsMap.entries()) {
        if (moves.length < minSolutionDepth) {
            minSolutionDepth = moves.length;
            bestState = JSON.parse(stateStr);
            bestSolution = moves;
        }
    }

    // Default fallback
    if (bestState.length === 0) {
        bestState = initialSequence.map(s => s.val);
        minSolutionDepth = 0;
    }

    return {
        maxYield: globalBestScore,
        distinctSolvedStates: bestSolutionsMap.size,
        minSolutionDepth,
        bestState,
        bestSolution,
        computationalComplexity: nodesVisited,
        allSolutions: options?.findAll ? allSolutions : undefined
    };
}
