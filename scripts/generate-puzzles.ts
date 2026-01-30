
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

const OUTPUT_FILE_PATH = path.join(process.cwd(), 'puzzles/daily_puzzles.json');
const LEVEL_LENGTH = 9;
const MIN_SOLUTION_DEPTH = 4;

// --- Production Schema Definitions ---

interface DailyPuzzleMove {
    tool: string;
    i: number;
    t?: number;
}

interface DailyPuzzle {
    id: number;           // Day Index (0, 1, 2...)
    sequence: number[];   // Raw values only
    tools: string[];      // Tool IDs (Types) available
    targets: {
        min: number;
        max: number;
    };
    solution: DailyPuzzleMove[];
}

/**
 * Custom recursive solver to find the optimal solution and metrics.
 * Now tracks moves as objects (DailyPuzzleMove) instead of strings.
 */
function solve(initialSequence: ISortable[], initialTools: ToolType[]): {
    maxYield: number;
    distinctSolvedStates: number;
    minSolutionDepth: number;
    bestState: number[];
    bestSolution: DailyPuzzleMove[];
    computationalComplexity: number;
} {
    let globalMaxScore = -Infinity;

    // Map<stateString, DailyPuzzleMove[]>
    // Stores the shortest path to reach a specific state that achieves globalMaxScore
    let bestSolutionsMap = new Map<string, DailyPuzzleMove[]>();
    let nodesVisited = 0;

    function search(currentSeq: ISortable[], currentTools: ToolType[], currentPath: DailyPuzzleMove[]) {
        nodesVisited++;

        // Pruning Rule: Discard branch if any number is less than 0 (if logic allows negative numbers somehow, but standard game is positive)
        // Adjust based on game rules if necessary, but existing script had this.
        if (currentSeq.some(s => s.val < 0)) {
            return;
        }

        const score = calculateBatchScore(currentSeq);
        const stateValString = JSON.stringify(currentSeq.map(s => s.val));

        // Logic: Update globalMaxScore and Map
        if (score > globalMaxScore) {
            globalMaxScore = score;
            bestSolutionsMap.clear();
            bestSolutionsMap.set(stateValString, [...currentPath]);
        } else if (score === globalMaxScore) {
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

                search(nextSeq, nextTools, [...currentPath, moveObj]);
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
        maxYield: globalMaxScore,
        distinctSolvedStates: bestSolutionsMap.size,
        minSolutionDepth,
        bestState,
        bestSolution,
        computationalComplexity: nodesVisited
    };
}

/**
 * Verifies that the serialized solution actually produces the promised max score.
 */
function verifyPuzzle(puzzle: DailyPuzzle): boolean {
    // Reconstruct Level
    let currentSeq: ISortable[] = puzzle.sequence.map(val => ({ val }));

    // Apply Moves
    for (const move of puzzle.solution) {
        const toolType = move.tool as ToolType;
        const strategy = TOOL_REGISTRY[toolType];
        if (!strategy) {
            console.error(`Verification Failed: Unknown tool ${toolType}`);
            return false;
        }
        currentSeq = strategy.apply(currentSeq, move.i, move.t);
    }

    // Check Score
    const finalScore = calculateBatchScore(currentSeq);
    const success = finalScore === puzzle.targets.max;

    if (!success) {
        console.error(`Verification Failed: Expected ${puzzle.targets.max}, got ${finalScore}`);
    }
    return success;
}

async function main() {
    const args = process.argv.slice(2);
    const count = parseInt(args[0], 10) || 1;

    console.log(`Generating ${count} daily puzzles...`);

    // We start from Day 0 for this batch, or append?
    // The requirement says "Assign them IDs 0 to N-1". 
    // Usually implies a fresh generation for a set. 
    // Only overwriting the file implies fresh generation.
    const puzzles: DailyPuzzle[] = [];

    let generatedCount = 0;
    while (generatedCount < count) {
        // Generate Tools
        const toolInstances = generateTools();
        const toolTypes = toolInstances.map(t => t.type);

        let validCandidateFound = false;

        while (!validCandidateFound) {
            // Generate Level
            const level = generateLevel(LEVEL_LENGTH);
            const initialSequenceNumbers = level.map(c => c.val);

            // Log progress
            process.stdout.write(`\r[${generatedCount + 1}/${count}] searching...`);

            // Solve
            const analysis = solve(level, toolTypes);

            // Filter: Depth
            if (analysis.minSolutionDepth < MIN_SOLUTION_DEPTH) {
                continue; // Retry with same tools
            }

            // Filter: Distinct Solved States
            if (analysis.distinctSolvedStates > 1) {
                continue; // Retry with same tools
            }

            // Calculate Metrics
            const minSol = findWorstSolution(level, toolTypes);
            const minYield = minSol.score;

            // Construct Puzzle Object
            const puzzle: DailyPuzzle = {
                id: generatedCount, // 0 to N-1
                sequence: initialSequenceNumbers,
                tools: toolTypes,
                targets: {
                    min: minYield,
                    max: analysis.maxYield
                },
                solution: analysis.bestSolution
            };

            // Verification Step
            if (!verifyPuzzle(puzzle)) {
                console.warn("\nVerification failed for candidate. Discarding.");
                continue;
            }

            puzzles.push(puzzle);
            validCandidateFound = true;
            console.log(` -> Found! (Depth: ${analysis.minSolutionDepth}, Nodes: ${analysis.computationalComplexity})`);
        }
        generatedCount++;
    }

    // Ensure output directory exists
    const dir = path.dirname(OUTPUT_FILE_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(puzzles, null, 2));
    console.log(`\nSuccessfully generated ${count} puzzles.`);
    console.log(`Saved to ${OUTPUT_FILE_PATH}`);
}

main();
