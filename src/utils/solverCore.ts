import { ToolType, ISortable } from '../../types.ts';
import { TOOL_REGISTRY } from '../tools/index.ts';

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

// Pure Logic Helper for Mode Determination & Survival
export const judgeStep = (
    currentVal: number,
    currentHasShield: boolean,
    lastSurvivorVal: number,
    currentMode: 'ASC' | 'DESC' | null
): { survived: boolean; newMode: 'ASC' | 'DESC' | null; scoreToAdd: number } => {
    let survived = false;
    let newMode = currentMode;
    let scoreToAdd = 0;

    // 1. Shield Logic (Always Survives)
    if (currentHasShield) {
        survived = true;
        // Edge Case: Shielded item can still set the mode if currently pending
        if (newMode === null) {
            if (currentVal > lastSurvivorVal) newMode = 'ASC';
            else if (currentVal < lastSurvivorVal) newMode = 'DESC';
        }
    }
    // 2. Standard Logic
    else {
        if (newMode === null) {
            // Pending Mode: Equality is OK (survival), Difference sets mode
            survived = true;
            if (currentVal > lastSurvivorVal) newMode = 'ASC';
            else if (currentVal < lastSurvivorVal) newMode = 'DESC';
        } else {
            // Determined Mode
            if (newMode === 'ASC') {
                if (currentVal >= lastSurvivorVal) survived = true;
            } else {
                if (currentVal <= lastSurvivorVal) survived = true;
            }
        }
    }

    if (survived) {
        scoreToAdd = currentVal;
    }

    return { survived, newMode, scoreToAdd };
};

// Pure function to calculate yield (sum of survivor values INCLUDING first item)
export const calculateBatchScore = (numbers: ISortable[]): number => {
    if (!numbers || numbers.length === 0) return 0;

    let yield_ = 0;
    let lastSurvivor = 0;
    let lastSurvivorHasShield = false;
    let mode: 'ASC' | 'DESC' | null = null;

    // Iterate
    for (let i = 0; i < numbers.length; i++) {
        const item = numbers[i];
        const currentVal = item.val;
        const currentHasShield = item.hasShield || false;
        let survived = false;

        if (i === 0) {
            survived = true;
            yield_ += currentVal; // Include first item's value
            lastSurvivor = currentVal;
            lastSurvivorHasShield = currentHasShield;
        } else {
            const result = judgeStep(currentVal, currentHasShield, lastSurvivor, mode);
            survived = result.survived;

            if (survived) {
                mode = result.newMode;
                yield_ += currentVal; // Add survivor's value
                lastSurvivor = currentVal;
                lastSurvivorHasShield = currentHasShield;
            }
        }
    }
    return yield_;
};

/**
 * Core Solver Function
 * Finds the optimal solution and metrics.
 */
export function solve(
    initialSequence: ISortable[],
    initialTools: ToolType[],
    objective: 'MAX' | 'MIN' = 'MAX',
    options?: { findAll?: boolean; threshold?: number }
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

        // Capture Alternative Logic (Optimization: Only if tools empty? Or simply high scores?)
        // Standard "Result" is usually when tools are exhausted or user stops.
        // But solver runs until tools exhausted.
        if (options?.findAll && currentTools.length === 0) {
            // Check threshold
            if (options.threshold !== undefined) {
                if (score > options.threshold) { // Assuming Delta Algo wants Higher Yield
                    // We store unique states? Or all paths?
                    // Let's store unique states (shortest path to them).
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
