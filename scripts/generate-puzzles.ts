import fs from 'fs';
import path from 'path';
import {
    generateLevel,
    generateTools,
    calculateBatchScore,
    findWorstSolution,
    calculateTrueYield,
    gradeLevel
} from '../src/utils/gameLogic';
import { TOOL_REGISTRY } from '../src/tools/index';
import { ToolType, ISortable, CardItem, HiddenRole } from '../types';
import { solve, DailyPuzzleMove, AlternativeSolution, judgeStep } from '../src/utils/solverCore';

const OUTPUT_FILE_PATH = path.join(process.cwd(), 'src/data/daily_puzzles.json');
const LEVEL_LENGTH = 9;
const MIN_SOLUTION_DEPTH = 4;

// --- Production Schema Definitions ---

interface DailyPuzzle {
    id: number;           // Day Index (0, 1, 2...)
    sequence: number[];   // Raw values only
    tools: string[];      // Tool IDs (Types) available
    targets: {
        min: number;
        max: number;
    };
    solution: DailyPuzzleMove[];
    // Resistance Data
    resistanceData?: {
        agents: Record<number, 'RESISTANCE' | 'STATE'>; // Original Index -> Role
        trueYieldTarget: number;
    };
}



function getKeptIndicesSet(initialLevel: CardItem[], moves: DailyPuzzleMove[]): Set<number> {
    // 1. Replay Moves
    let currentSeq = initialLevel.map((item, idx) => ({ ...item, originalIndex: idx }));
    for (const move of moves) {
        const strategy = TOOL_REGISTRY[move.tool as ToolType];
        if (strategy) {
            currentSeq = strategy.apply(currentSeq, move.i, move.t) as unknown as typeof currentSeq;
        }
    }

    // 2. Grade
    const { gradedList } = gradeLevel(currentSeq);

    // 3. Collect Safe Original Indices
    const kept = new Set<number>();
    gradedList.forEach((item: any) => {
        if (item.status !== 'eliminated') {
            kept.add(item.originalIndex);
        }
    });

    return kept;
}

async function main() {
    const args = process.argv.slice(2);
    const count = parseInt(args[0], 10) || 1;

    console.log(`Generating ${count} daily puzzles with Resistance Layers...`);
    const puzzles: DailyPuzzle[] = [];

    // Import gradeLevel helper (workaround for pure write)
    // I will assume explicit import in the file content below.

    let generatedCount = 0;
    while (generatedCount < count) {
        generatedCount++;

        // 1. Generate Tools
        const toolInstances = generateTools();
        const toolTypes = toolInstances.map(t => t.type);

        // 2. Find Valid Base Puzzle
        let validCandidateFound = false;
        let puzzle: DailyPuzzle | null = null;

        while (!validCandidateFound) {
            const level = generateLevel(LEVEL_LENGTH);
            const initialSequenceNumbers = level.map(c => c.val);
            const initialScore = calculateBatchScore(level);

            process.stdout.write(`\r[${generatedCount}/${count}] searching...`);

            // Standard Solve
            const analysis = solve(level, toolTypes, 'MAX');

            if (analysis.minSolutionDepth < MIN_SOLUTION_DEPTH || analysis.distinctSolvedStates > 1) {
                continue;
            }

            // Base Puzzle
            const minSol = findWorstSolution(level, toolTypes);

            const basePuzzle: DailyPuzzle = {
                id: generatedCount - 1,
                sequence: initialSequenceNumbers,
                tools: toolTypes,
                targets: { min: minSol.score, max: analysis.maxYield },
                solution: analysis.bestSolution
            };

            // 3. Search for Resistance Layer
            // We need alternatives that yield > initialScore.
            // We use findAll mode.
            // Threshold: initialScore (strict >)
            const altAnalysis = solve(level, toolTypes, 'MAX', { findAll: true, threshold: initialScore });

            const standardKeptIndices = getKeptIndicesSet(level, analysis.bestSolution);

            let validResData = null;

            if (altAnalysis.allSolutions) {
                for (const alt of altAnalysis.allSolutions) {
                    // Check: Kept Indices != Standard Kept Indices
                    const altKeptIndices = getKeptIndicesSet(level, alt.moves);

                    // Helper: Sets equal?
                    const areSetsEqual = (a: Set<number>, b: Set<number>) =>
                        a.size === b.size && [...a].every(value => b.has(value));

                    if (areSetsEqual(standardKeptIndices, altKeptIndices)) continue;

                    // Derive Roles
                    // Resistance Agent: In Alt (ResSet), NOT in Standard (StateSet)
                    // State Agent: In Standard (StateSet), NOT in Alt (ResSet)

                    const resistanceAgents: number[] = [];
                    const stateAgents: number[] = [];

                    altKeptIndices.forEach(idx => {
                        if (!standardKeptIndices.has(idx)) resistanceAgents.push(idx);
                    });

                    standardKeptIndices.forEach(idx => {
                        if (!altKeptIndices.has(idx)) stateAgents.push(idx);
                    });

                    // Constraint: At least 1 of each
                    if (resistanceAgents.length > 0 && stateAgents.length > 0) {
                        // FOUND ONE!

                        // Assign Roles & True Values
                        const agentsMap: Record<number, 'RESISTANCE' | 'STATE'> = {};
                        resistanceAgents.forEach(i => agentsMap[i] = 'RESISTANCE');
                        stateAgents.forEach(i => agentsMap[i] = 'STATE');

                        // Calculate True Yield of the Resistance Path
                        // Need to construct CardItems with True Values
                        const trueLevel = level.map((item, originalIdx) => {
                            let trueVal = item.val;
                            const role = agentsMap[originalIdx];
                            if (role === 'RESISTANCE') trueVal = item.val - 2;
                            else if (role === 'STATE') trueVal = item.val + 3;

                            return { ...item, trueValue: trueVal, hiddenRole: role ? (role === 'RESISTANCE' ? HiddenRole.RESISTANCE : HiddenRole.STATE) : HiddenRole.NONE };
                        });

                        // Replay resistance moves on True Level
                        // We need `calculateTrueYield` which sums trueValue of Survivors.
                        // First get kept indices set for this path (we have it: altKeptIndices).
                        // Sum true values of those indices.

                        let startTrueYield = 0;
                        // Initial true yield (no moves)?
                        // "TrueYield > InitialTrueYield".
                        // Initial Survivors (index 0..N, calculateBatchScore based on VISIBLE values logic determines survival, but we sum TRUE values?)
                        // Assuming "Initial" means "Before Sorting".
                        // `calculateTrueYield` function in gameLogic takes `items` and `targetLength`.
                        // Using `targetLength` implies "Keep Zone" logic.
                        // For initial state, if we treat it as sorted?
                        // "Plausible Deniability... Yield > InitialYield" refers to VISIBLE yield (which we checked with threshold).
                        // "Validation... Verify that the ResSet solution... results in a TrueYield > InitialTrueYield".

                        // Initial State True Yield:
                        // Run `gradeLevel` on initial `trueLevel` (using VISIBLE values for survival logic).
                        // Sum trueValue of survivors.

                        const gradedInitial = gradeLevel(trueLevel).gradedList;
                        const initialTrueYield = gradedInitial.reduce((sum: number, item: any) =>
                            item.status !== 'eliminated' ? sum + item.trueValue : sum, 0);

                        // Resistance Solution True Yield:
                        // Replay moves on `trueLevel`.
                        let currentTrueSeq = trueLevel.map((item, idx) => ({ ...item, originalIndex: idx }));
                        for (const m of alt.moves) {
                            const s = TOOL_REGISTRY[m.tool as ToolType];
                            if (s) currentTrueSeq = s.apply(currentTrueSeq, m.i, m.t) as unknown as typeof currentTrueSeq;
                        }
                        const gradedRes = gradeLevel(currentTrueSeq).gradedList;
                        const resTrueYield = gradedRes.reduce((sum: number, item: any) =>
                            item.status !== 'eliminated' ? sum + item.trueValue : sum, 0);

                        if (resTrueYield > initialTrueYield) {
                            // Valid!
                            validResData = {
                                agents: agentsMap,
                                trueYieldTarget: resTrueYield
                            };
                            break; // Stop looking for helpers, we found a valid configuration.
                        }
                    }
                }
            }

            if (validResData) {
                basePuzzle.resistanceData = validResData;
                puzzle = basePuzzle;
                validCandidateFound = true;
                console.log(` -> Found Resistance Layer! (Standard: ${analysis.maxYield}, Res Path: ${validResData.trueYieldTarget})`);
            } else {
                // console.log(" -> No valid resistance layer found. Retrying...");
            }
        }

        if (puzzle) puzzles.push(puzzle);
    }

    // Write
    const dir = path.dirname(OUTPUT_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(puzzles, null, 2));
    console.log(`\nSuccessfully generated ${count} puzzles.`);
}

main();
