import fs from 'fs';
import path from 'path';
import {
    generateLevel,
    generateTools,
    calculateBatchScore,
    findWorstSolution
} from '../src/utils/gameLogic';
import { TOOL_REGISTRY } from '../src/tools/index';
import { ToolType, ISortable } from '../types';

const PUZZLE_FILE_PATH = path.join(process.cwd(), 'puzzles/puzzle-candidates.json');
const LEVEL_LENGTH = 9;
const MIN_SOLUTION_DEPTH = 4;

interface PuzzleCandidate {
    initialSequence: number[];
    tools: string[];
    solvedState: number[]; // The most efficient one found
    metrics: {
        initialYield: number;
        minYield: number;
        maxYield: number;
        distinctSolvedStates: number; // count of map entries
        distinctToolPaths: number; // count of all valid move sequences to max score
        computationalComplexity: number; // nodes visited
        minSolutionDepth: number;
    };
    solutions: Array<{
        state: number[];
        moves: string[]; // Human-readable strings, e.g., "swap @ 0"
    }>;
}

/**
 * Custom recursive solver to find all requested metrics.
 * Explores the full state space defined by the available tools.
 */
function solve(initialSequence: ISortable[], initialTools: ToolType[]): {
    maxYield: number;
    distinctSolvedStates: number;
    distinctToolPaths: number;
    computationalComplexity: number;
    minSolutionDepth: number;
    bestState: number[];
    solutions: Array<{ state: number[], moves: string[] }>;
} {
    let globalMaxScore = -Infinity;
    // Map<stateString, movePath[]>
    // Stores the shortest path to reach a specific state that achieves globalMaxScore
    let bestSolutionsMap = new Map<string, string[]>();
    let totalPathsToMax = 0;
    let nodesVisited = 0;

    function search(currentSeq: ISortable[], currentTools: ToolType[], currentPath: string[]) {
        nodesVisited++;
        // Pruning Rule: Discard branch if any number is less than 0
        if (currentSeq.some(s => s.val < 0)) {
            return;
        }

        const score = calculateBatchScore(currentSeq);
        const stateValString = JSON.stringify(currentSeq.map(s => s.val));

        // Logic: Update globalMaxScore and Map
        if (score > globalMaxScore) {
            globalMaxScore = score;
            totalPathsToMax = 1;
            bestSolutionsMap.clear();
            bestSolutionsMap.set(stateValString, [...currentPath]);
        } else if (score === globalMaxScore) {
            totalPathsToMax++;
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
                const nextSeq = strategy.apply(currentSeq, move.index, move.targetIndex) as ISortable[];
                // Format move string. user example: "swap @ 0"
                const moveStr = `${toolType} @ ${move.index}`;
                search(nextSeq, nextTools, [...currentPath, moveStr]);
            }
        }
    }

    search(initialSequence, initialTools, []);

    // Post-Processing Selection
    let minSolutionDepth = Infinity;
    let bestState: number[] = [];
    const solutionObjects: Array<{ state: number[], moves: string[] }> = [];

    for (const [stateStr, moves] of bestSolutionsMap.entries()) {
        const state = JSON.parse(stateStr);
        solutionObjects.push({
            state: state,
            moves: moves
        });

        if (moves.length < minSolutionDepth) {
            minSolutionDepth = moves.length;
            bestState = state;
        }
    }

    // Default fallback if no valid state found (unlikely unless initial state is invalid)
    if (bestState.length === 0) {
        bestState = initialSequence.map(s => s.val);
        minSolutionDepth = 0;
    }

    return {
        maxYield: globalMaxScore,
        distinctSolvedStates: bestSolutionsMap.size,
        distinctToolPaths: totalPathsToMax,
        computationalComplexity: nodesVisited,
        minSolutionDepth: minSolutionDepth,
        bestState: bestState,
        solutions: solutionObjects
    };
}

async function main() {
    const args = process.argv.slice(2);
    const count = parseInt(args[0], 10) || 1;

    console.log(`Generating ${count} puzzle candidates...`);

    let candidates: PuzzleCandidate[] = [];
    if (fs.existsSync(PUZZLE_FILE_PATH)) {
        try {
            const data = fs.readFileSync(PUZZLE_FILE_PATH, 'utf-8');
            candidates = JSON.parse(data);
        } catch (e) {
            console.warn('Could not read existing candidates, starting fresh.');
            candidates = [];
        }
    }

    if (!Array.isArray(candidates)) {
        candidates = [];
    }

    let generatedCount = 0;
    while (generatedCount < count) {
        // Generate Level (Random, no seed)
        const level = generateLevel(LEVEL_LENGTH);
        const toolInstances = generateTools();
        const toolTypes = toolInstances.map(t => t.type);

        console.log(`[${generatedCount + 1}/${count}] Analyzing...`);

        // Deep Analysis (Max Yield & others)
        const analysis = solve(level, toolTypes);

        // Filter: Check if analysis.minSolutionDepth >= MIN_SOLUTION_DEPTH.
        if (analysis.minSolutionDepth < MIN_SOLUTION_DEPTH) {
            console.log(`Discarding candidate (Depth ${analysis.minSolutionDepth} < ${MIN_SOLUTION_DEPTH})`);
            continue;
        }

        // Initial Yield
        const initialYield = calculateBatchScore(level);

        // Min Yield (Worst Case)
        // findWorstSolution returns { score, moves }
        const minSol = findWorstSolution(level, toolTypes);
        const minYield = minSol.score;

        const puzzle: PuzzleCandidate = {
            initialSequence: level.map(i => i.val),
            tools: toolTypes,
            solvedState: analysis.bestState,
            metrics: {
                initialYield,
                minYield,
                maxYield: analysis.maxYield,
                distinctSolvedStates: analysis.distinctSolvedStates,
                distinctToolPaths: analysis.distinctToolPaths,
                computationalComplexity: analysis.computationalComplexity,
                minSolutionDepth: analysis.minSolutionDepth
            },
            solutions: analysis.solutions
        };

        console.log(`Accepted (Depth ${analysis.minSolutionDepth}, Complexity ${analysis.computationalComplexity})`);

        candidates.push(puzzle);
        generatedCount++;
    }

    fs.writeFileSync(PUZZLE_FILE_PATH, JSON.stringify(candidates, null, 2));
    console.log(`Successfully generated ${count} puzzles. Saved to ${PUZZLE_FILE_PATH}`);
}

main();
