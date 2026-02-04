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
        agents: Record<number, { role: 'RESISTANCE' | 'STATE'; delta: number }>; // Original Index -> {role, delta}
        resistanceTarget: number;
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
        console.log('\n[Tools Selected]:', toolTypes.join(', '));

        // 2. Find Valid Base Puzzle
        let validCandidateFound = false;
        let puzzle: DailyPuzzle | null = null;
        let candidateAttempt = 0;

        while (!validCandidateFound) {
            candidateAttempt++;
            const level = generateLevel(LEVEL_LENGTH);
            const initialSequenceNumbers = level.map(c => c.val);
            const initialScore = calculateBatchScore(level);

            process.stdout.write(`[Attempt ${candidateAttempt}] Seq: [${initialSequenceNumbers.slice(0, 3).join(',')}...] `);

            // Standard Solve
            const analysis = solve(level, toolTypes, 'MAX');

            if (analysis.minSolutionDepth < MIN_SOLUTION_DEPTH) {
                // Determine unused tools
                const toolsUsed = analysis.bestSolution.map(move => move.tool);
                // Create a copy of toolTypes to track available tools
                const availableTools = [...toolTypes];

                // Remove used tools from availableTools one by one to handle duplicates correctly
                for (const usedTool of toolsUsed) {
                    const index = availableTools.indexOf(usedTool);
                    if (index !== -1) {
                        availableTools.splice(index, 1);
                    }
                }

                const unusedTools = availableTools;
                console.log(`-> Discarded: Depth ${analysis.minSolutionDepth} < ${MIN_SOLUTION_DEPTH} (Too easy). Unused Tools: [${unusedTools.join(', ')}]`);
                continue;
            }
            if (analysis.distinctSolvedStates > 1) {
                console.log(`-> Discarded: Distinct Solutions ${analysis.distinctSolvedStates} > 1`);
                continue;
            }

            console.log(`-> Base Valid. Searching for Resistance Layer...`);

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
                let altIndex = 0;
                for (const alt of altAnalysis.allSolutions) {
                    altIndex++;
                    // Check: Kept Indices != Standard Kept Indices
                    const altKeptIndices = getKeptIndicesSet(level, alt.moves);

                    // Helper: Sets equal?
                    const areSetsEqual = (a: Set<number>, b: Set<number>) =>
                        a.size === b.size && [...a].every(value => b.has(value));

                    if (areSetsEqual(standardKeptIndices, altKeptIndices)) {
                        console.log(`   -> Alt ${altIndex}: Discarded (Sets equal)`);
                        continue;
                    }

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
                    if (resistanceAgents.length < 1 || stateAgents.length < 1) {
                        console.log(`   -> Alt ${altIndex}: Discarded (Insufficient roles: R=${resistanceAgents.length}, S=${stateAgents.length})`);
                        continue;
                    }

                    if (resistanceAgents.length >= 1 && stateAgents.length >= 1) {
                        // FOUND ONE!

                        // Randomly define scenario: 2 or 3 agents
                        const scenarios: ('1v1' | '2v1' | '1v2')[] = [];
                        if (resistanceAgents.length >= 1 && stateAgents.length >= 1) scenarios.push('1v1');
                        if (resistanceAgents.length >= 2 && stateAgents.length >= 1) scenarios.push('2v1');
                        if (resistanceAgents.length >= 1 && stateAgents.length >= 2) scenarios.push('1v2');

                        if (scenarios.length === 0) continue;

                        const distribution = scenarios[Math.floor(Math.random() * scenarios.length)];

                        // Select Indices
                        const shuffle = (arr: number[]) => [...arr].sort(() => Math.random() - 0.5);
                        const shuffledRes = shuffle(resistanceAgents);
                        const shuffledState = shuffle(stateAgents);

                        let selectedResIndices: number[] = [];
                        let selectedStateIndices: number[] = [];

                        if (distribution === '1v1') {
                            selectedResIndices = [shuffledRes[0]];
                            selectedStateIndices = [shuffledState[0]];
                        } else if (distribution === '2v1') {
                            selectedResIndices = [shuffledRes[0], shuffledRes[1]];
                            selectedStateIndices = [shuffledState[0]];
                        } else { // 1v2
                            selectedResIndices = [shuffledRes[0]];
                            selectedStateIndices = [shuffledState[0], shuffledState[1]];
                        }

                        // Calculate Deltas (Zero-Sum)
                        let validDeltasFound = false;
                        let deltaAttempts = 0;
                        const MAX_DELTA_ATTEMPTS = 50;
                        const agentsMap: Record<number, { role: 'RESISTANCE' | 'STATE'; delta: number }> = {};

                        while (!validDeltasFound && deltaAttempts < MAX_DELTA_ATTEMPTS) {
                            deltaAttempts++;
                            const tempMap: typeof agentsMap = {};
                            let validRun = true;

                            if (distribution === '1v1') {
                                // 1v1: Res = -X, State = +X. X in [1..3]
                                const mag = Math.floor(Math.random() * 3) + 1;
                                tempMap[selectedResIndices[0]] = { role: 'RESISTANCE', delta: -mag };
                                tempMap[selectedStateIndices[0]] = { role: 'STATE', delta: mag };
                            }
                            else if (distribution === '2v1') {
                                // 2 Res (Group A), 1 State (Group B)
                                const r1 = -(Math.floor(Math.random() * 3) + 1);
                                const r2 = -(Math.floor(Math.random() * 3) + 1);
                                const stateNeeded = -(r1 + r2);

                                if (stateNeeded > 5) validRun = false;
                                else {
                                    tempMap[selectedResIndices[0]] = { role: 'RESISTANCE', delta: r1 };
                                    tempMap[selectedResIndices[1]] = { role: 'RESISTANCE', delta: r2 };
                                    tempMap[selectedStateIndices[0]] = { role: 'STATE', delta: stateNeeded };
                                }
                            }
                            else { // 1v2: 1 Res (Group B), 2 State (Group A)
                                const s1 = (Math.floor(Math.random() * 3) + 1);
                                const s2 = (Math.floor(Math.random() * 3) + 1);
                                const resNeeded = -(s1 + s2);

                                if (resNeeded < -5) validRun = false;
                                else {
                                    tempMap[selectedStateIndices[0]] = { role: 'STATE', delta: s1 };
                                    tempMap[selectedStateIndices[1]] = { role: 'STATE', delta: s2 };
                                    tempMap[selectedResIndices[0]] = { role: 'RESISTANCE', delta: resNeeded };
                                }
                            }

                            if (validRun) {
                                Object.assign(agentsMap, tempMap);
                                validDeltasFound = true;
                            }
                        }

                        if (!validDeltasFound) {
                            console.log(`   -> Alt ${altIndex}: Discarded (Could not balance deltas)`);
                            continue;
                        }

                        // 1. Calculate Initial True Yield (Baseline)
                        const trueLevel = level.map((item, originalIdx) => {
                            let trueVal = item.val;
                            const agentData = agentsMap[originalIdx];
                            if (agentData) {
                                trueVal = item.val + agentData.delta;
                            }
                            return { ...item, trueValue: trueVal, hiddenRole: agentData ? (agentData.role === 'RESISTANCE' ? HiddenRole.RESISTANCE : HiddenRole.STATE) : HiddenRole.NONE };
                        });

                        const gradedInitial = gradeLevel(trueLevel).gradedList;
                        const initialTrueYield = gradedInitial.reduce((sum: number, item: any) =>
                            item.status !== 'eliminated' ? sum + item.trueValue : sum, 0);

                        // 2. Find MAX True Yield satisfying constraints among ALL valid solutions
                        // Recalculate all solutions with a low threshold to get maximum coverage
                        const validationAnalysis = solve(level, toolTypes, 'MAX', { findAll: true, threshold: -Infinity });

                        let maxValidTrueYield = -Infinity;
                        let maxValidVisibleYield = -Infinity;
                        let foundConstraintSatisfyingPath = false;

                        if (validationAnalysis.allSolutions) {
                            for (const sol of validationAnalysis.allSolutions) {
                                const keptIndices = getKeptIndicesSet(level, sol.moves);

                                // Constraint Check
                                const allResistanceSurvive = selectedResIndices.every(idx => keptIndices.has(idx));
                                const allStateEliminated = selectedStateIndices.every(idx => !keptIndices.has(idx));

                                if (allResistanceSurvive && allStateEliminated) {
                                    // Valid Path! Calculate True Yield.
                                    let currentTrueYield = 0;
                                    let currentVisibleYield = 0;

                                    keptIndices.forEach(idx => {
                                        currentTrueYield += trueLevel[idx].trueValue;
                                        currentVisibleYield += trueLevel[idx].val;
                                    });

                                    if (currentTrueYield > maxValidTrueYield) {
                                        maxValidTrueYield = currentTrueYield;
                                        maxValidVisibleYield = currentVisibleYield;
                                        foundConstraintSatisfyingPath = true;
                                    }
                                }
                            }
                        }

                        if (foundConstraintSatisfyingPath && maxValidTrueYield > initialTrueYield) {
                            // Valid!
                            validResData = {
                                agents: agentsMap,
                                resistanceTarget: maxValidVisibleYield
                            };
                            break; // Stop looking for helpers, we found a max yield configuration.
                        } else {
                            console.log(`   -> Alt ${altIndex}: Discarded (Max Yield ${maxValidTrueYield} <= Initial ${initialTrueYield} or No Path)`);
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
                console.log(`[Attempt ${candidateAttempt}] Failed: Resistance layer constraints not met.`);
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
