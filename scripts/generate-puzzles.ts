import fs from 'fs';
import path from 'path';
import {
    generateLevel,
    generateTools,
    calculateBatchScore,
    findWorstSolution,
    gradeLevel
} from '../src/utils/gameLogic';
import { TOOL_REGISTRY } from '../src/tools/index';
import { ToolType, CardItem, AgentRole } from '../types';
import { solve, DailyPuzzleMove } from '../src/utils/solverCore';

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
        agents: Record<number, 'resistance' | 'state'>; // originalIndex -> role
        targetYield: number; // The max score possible GIVEN the survival constraints
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

    console.log(`Generating ${count} daily puzzles with Constraint-Based Resistance Layers...`);
    const puzzles: DailyPuzzle[] = [];

    let generatedCount = 0;
    while (generatedCount < count) {
        generatedCount++;

        // 1. Generate Tools
        const toolInstances = generateTools();
        const toolTypes = toolInstances.map(t => t.type);
        console.log('\n[Tools Selected]:', toolTypes.join(', '));

        // 2. Find Valid Base Puzzle
        let validCandidateFound = false;
        let puzzle: DailyPuzzle | null = null;
        let candidateAttempt = 0;

        while (!validCandidateFound) {
            candidateAttempt++;
            const level = generateLevel(LEVEL_LENGTH); // Note: seed is optional, random here
            const initialSequenceNumbers = level.map(c => c.val);
            const initialScore = calculateBatchScore(level);

            process.stdout.write(`[Attempt ${candidateAttempt}] Seq: [${initialSequenceNumbers.slice(0, 3).join(',')}...] `);

            // Standard Solve
            const analysis = solve(level, toolTypes, 'MAX');

            if (analysis.minSolutionDepth < MIN_SOLUTION_DEPTH) {
                // Too easy
                console.log(`-> Discarded: Depth ${analysis.minSolutionDepth} < ${MIN_SOLUTION_DEPTH}`);
                continue;
            }
            if (analysis.distinctSolvedStates > 1) {
                // Determine uniqueness logic if strict. Assuming distinct solutions means different end states (which is bad for puzzle purity usually, but here we just want unique max).
                // Actually, distinct solutions usually means different optimal outcomes. If > 1, it's ambiguous.
                console.log(`-> Discarded: Ambiguous Solutions (${analysis.distinctSolvedStates})`);
                continue;
            }

            console.log(`-> Base Valid (Max: ${analysis.maxYield}). Searching for Resistance Layer...`);

            // Base Puzzle Structure
            const minSol = findWorstSolution(level, toolTypes);
            const basePuzzle: DailyPuzzle = {
                id: generatedCount - 1,
                sequence: initialSequenceNumbers,
                tools: toolTypes,
                targets: { min: minSol.score, max: analysis.maxYield },
                solution: analysis.bestSolution
            };

            // 3. Search for Resistance Layer (Constraint Optimization)
            // We need to find a pair of indices (Resistance, State) such that:
            // There exists a solution (valid move sequence) where Res is SAFE and State is ELIMINATED.
            // And calculate the Max Yield under this constraint.

            // First, get ALL potential solutions (not just optimal).
            // We need a wide search. Using 'findAll' with a reasonable threshold.
            // If we only look at optimal solutions for the base puzzle, we might limit our resistance design space.
            // However, the player is trying to maximize score.
            // The prompt says: "Find all valid solutions (move sequences) for this level."
            // But usually "valid solutions" implies solving the sorting problem? Or just any valid moves?
            // "Filter the solutions to find those where..."
            // Usually, "solutions" means reaching a solved state (sorted).
            // So we use existing solver with findAll.

            // To ensure we have enough variety, we might set threshold slightly lower than maxYield?
            // Or ideally, we simply want ANY sorted outcome.
            // Let's use threshold = -Infinity to capture all sorted states the solver finds.
            const allSolutionsAnalysis = solve(level, toolTypes, 'MAX', { findAll: true, threshold: -Infinity });

            if (!allSolutionsAnalysis.allSolutions || allSolutionsAnalysis.allSolutions.length === 0) {
                console.log(`   -> No solutions found for analysis.`);
                continue;
            }

            // We iterate through potential roles.
            // A simpler approach:
            // Iterate all solutions.
            // For each solution, define Safe Set (S) and Eliminated Set (E).
            // We need Res in S and State in E.
            // We can pick any `r` in S and `s` in E.
            // But we want a scenario that is interesting.
            // The max yield under this constraint (TargetYield) should ideally be less than Global Max Yield?
            // Or it could be the same.
            // If TargetYield == Global Max Yield, then the resistance mission is "natural" (just play optimally).
            // That's boring. We prefer if TargetYield < Global Max Yield?
            // Or maybe TargetYield IS the Global Max Yield but forces a specific path?
            // Prompt says: "The puzzle is no longer about guessing numbers; it is about sorting the list to ensure specific survival outcomes while maximizing the score."
            // Implicitly, this might force suboptimal moves regarding abstract numbers, effectively creating a constraint optimization problem.

            // Let's look for cases where `TargetYield` is high enough to be a puzzle.
            // Ideally, we find a pair (r, s) such that we force a specific subset of solutions.

            let validResData = null;

            // Randomly try pairs to avoid O(N^2) * Solutions
            // Actually, we can just aggregate stats.
            // Map (r, s) -> MaxYield.
            // Then pick one with decent MaxYield (maybe >= 50% of possible?)

            const constraintMap = new Map<string, number>(); // "r,s" -> maxYield

            for (const sol of allSolutionsAnalysis.allSolutions) {
                const keptIndices = getKeptIndicesSet(level, sol.moves);
                const score = sol.score; // Use the score from the solution

                // For every pair r in Kept, s in NotKept:
                // Update max yield for this pair.
                // keptIndices is a Set<number>
                // We need the inverse set.
                const eliminatedIndices: number[] = [];
                for (let i = 0; i < LEVEL_LENGTH; i++) {
                    if (!keptIndices.has(i)) eliminatedIndices.push(i);
                }

                keptIndices.forEach(r => {
                    eliminatedIndices.forEach(s => {
                        const key = `${r},${s}`;
                        const currentMax = constraintMap.get(key) || -Infinity;
                        if (score > currentMax) {
                            constraintMap.set(key, score);
                        }
                    });
                });
            }

            // Now we have a map of potential missions and their achievable yields.
            // We filter for "Interesting" missions.
            // Interesting = ?
            // Maybe just random one that is possible?
            // Let's just pick one with High Yield (close to Max, or reasonably high).

            const possibleConstraints = Array.from(constraintMap.entries()).filter(([_, yieldVal]) => {
                // Filter out very low yields?
                // Ensure yield is at least > Initial Score?
                return yieldVal > initialScore;
            });

            if (possibleConstraints.length > 0) {
                // Pick random
                const [key, targetYield] = possibleConstraints[Math.floor(Math.random() * possibleConstraints.length)];
                const [rStr, sStr] = key.split(',');
                const r = parseInt(rStr, 10);
                const s = parseInt(sStr, 10);

                validResData = {
                    agents: {
                        [r]: 'resistance',
                        [s]: 'state'
                    } as Record<number, 'resistance' | 'state'>,
                    targetYield: targetYield
                };
            }

            if (validResData) {
                basePuzzle.resistanceData = validResData;
                puzzle = basePuzzle;
                validCandidateFound = true;
                console.log(` -> Found Constraint Layer! (R: ${Object.keys(validResData.agents).find(k => validResData.agents[Number(k)] === 'resistance')}, S: ${Object.keys(validResData.agents).find(k => validResData.agents[Number(k)] === 'state')}, Target: ${validResData.targetYield})`);
            } else {
                console.log(`   -> Failed to find valid constraint pair.`);
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

