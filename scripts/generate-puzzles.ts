
import fs from 'fs';
import path from 'path';
import {
    generateLevel,
    generateTools,
    calculateBatchScore,
    findWorstSolution,
    gradeLevel
} from '../src/utils/gameLogic.ts';
import { TOOL_REGISTRY } from '../src/tools/index.ts';
import { ToolType, CardItem } from '../types.ts';
import { solve, DailyPuzzleMove } from '../src/utils/solverCore.ts';

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
            // Modified Requirement:
            // Resistance Agent: Must be ELIMINATED in Optimal Solution (but Survives in Alt)
            // State Agent: Must be SAFE in Optimal Solution (but Eliminated in Alt)
            // Alt Solution Yield > Initial Yield

            // First, Determine Optimal Status Mapping
            const optimalKept = getKeptIndicesSet(level, analysis.bestSolution);

            // We use 'findAll' to get all potential outcomes
            const allSolutionsAnalysis = solve(level, toolTypes, 'MAX', { findAll: true, threshold: initialScore });

            if (!allSolutionsAnalysis.allSolutions || allSolutionsAnalysis.allSolutions.length === 0) {
                console.log(`   -> No solutions found for analysis.`);
                continue;
            }

            let validResData: { agents: Record<number, 'resistance' | 'state'>; targetYield: number } | null = null;
            const constraintMap = new Map<string, number>(); // "r,s" -> maxYield

            for (const sol of allSolutionsAnalysis.allSolutions) {
                // Requirement: Score > Initial
                if (sol.score <= initialScore) continue;

                const altKept = getKeptIndicesSet(level, sol.moves);

                // Find Valid Resistance Agents (Eliminated in Optimal, Kept Here)
                const validResAgents: number[] = [];
                altKept.forEach(idx => {
                    if (!optimalKept.has(idx)) { // It was NOT kept in optimal
                        validResAgents.push(idx);
                    }
                });

                // Find Valid State Agents (Kept in Optimal, Eliminated Here)
                const validStateAgents: number[] = [];
                for (let i = 0; i < LEVEL_LENGTH; i++) {
                    if (!altKept.has(i)) { // Eliminated Here
                        if (optimalKept.has(i)) { // But Was Kept in Optimal
                            validStateAgents.push(i);
                        }
                    }
                }

                // Register Pairs
                for (const r of validResAgents) {
                    for (const s of validStateAgents) {
                        const key = `${r},${s}`;
                        const currentMax = constraintMap.get(key) || -Infinity;
                        if (sol.score > currentMax) {
                            constraintMap.set(key, sol.score);
                        }
                    }
                }
            }

            // Now we have a map of potential missions and their achievable yields.
            // We filter for distinct missions where targetYield is defined.

            const possibleConstraints = Array.from(constraintMap.entries()).filter(([_, yieldVal]) => {
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
