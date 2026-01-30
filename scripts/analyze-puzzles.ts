import fs from 'fs';
import path from 'path';
import { TOOL_META, ALL_TOOL_TYPES } from '../src/toolDefinitions';

// --- Interfaces ---
interface PuzzleMetrics {
    initialYield: number;
    minYield: number;
    maxYield: number;
    distinctSolvedStates: number;
    distinctToolPaths: number;
    computationalComplexity: number;
    minSolutionDepth: number;
}

interface PuzzleCandidate {
    metrics: PuzzleMetrics;
    tools: string[];
    initialSequence: number[];
    solvedState: number[];
}

interface Stats {
    Metric: string;
    Min: number;
    Max: number;
    Mean: string;
    Median: number;
    StdDev: string;
    p50?: number;
    p90?: number;
    p99?: number;
}

// --- Configuration ---
const PUZZLE_FILE_PATH = path.join(process.cwd(), 'puzzles/puzzle-candidates.json');

function calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
}

function calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    // If even length, average the two middle numbers
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}

function calculateStdDev(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = calculateMean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
}

function calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
}

function generateStats(name: string, values: number[]): Stats {
    const mean = calculateMean(values);
    return {
        Metric: name,
        Min: Math.min(...values),
        Max: Math.max(...values),
        Mean: mean.toFixed(2),
        Median: calculateMedian(values),
        StdDev: calculateStdDev(values, mean).toFixed(2)
    };
}

function analyze() {
    if (!fs.existsSync(PUZZLE_FILE_PATH)) {
        console.error(`Error: File not found at ${PUZZLE_FILE_PATH}`);
        process.exit(1);
    }

    let candidates: PuzzleCandidate[] = [];
    try {
        const data = fs.readFileSync(PUZZLE_FILE_PATH, 'utf-8');
        candidates = JSON.parse(data);
    } catch (e) {
        console.error('Error parsing JSON:', e);
        process.exit(1);
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
        console.log('No puzzles found to analyze.');
        return;
    }

    console.log(`\nAnalyzing ${candidates.length} puzzle candidates...\n`);

    const initialYields = candidates.map(c => c.metrics.initialYield);
    const maxYields = candidates.map(c => c.metrics.maxYield);
    const minYields = candidates.map(c => c.metrics.minYield);
    const distinctStates = candidates.map(c => c.metrics.distinctSolvedStates);
    const complexities = candidates.map(c => c.metrics.computationalComplexity);
    const minSolutionDepths = candidates.map(c => c.metrics.minSolutionDepth);

    const reportData: Stats[] = [
        generateStats('Initial Yield', initialYields),
        generateStats('Max Yield', maxYields),
        generateStats('Yield Delta', candidates.map(c => c.metrics.maxYield - c.metrics.initialYield)),
        generateStats('Min Yield', minYields),
        generateStats('Min Solution Depth', minSolutionDepths),
        generateStats('Distinct Solved States', distinctStates),
        generateStats('Computational Complexity', complexities)
    ];

    // Add percentiles to complexity row specifically
    const complexityStats = reportData.find(s => s.Metric === 'Computational Complexity');
    if (complexityStats) {
        complexityStats.p50 = calculatePercentile(complexities, 50);
        complexityStats.p90 = calculatePercentile(complexities, 90);
        complexityStats.p99 = calculatePercentile(complexities, 99);
    }

    console.table(reportData);

    console.log('\n--- Complexity Deep Dive ---');
    console.log(`p50 (Median):  ${calculatePercentile(complexities, 50)}`);
    console.log(`p90 (High):    ${calculatePercentile(complexities, 90)}`);
    console.log(`p99 (Extreme): ${calculatePercentile(complexities, 99)}`);

    // --- Tool Analysis ---
    console.log('\n--- Tool Distribution Analysis ---');

    // 1. Calculate Expected Weights
    const totalWeight = Object.values(TOOL_META).reduce((sum, meta) => sum + meta.weight, 0);
    const expectedDistribution: Record<string, number> = {};
    ALL_TOOL_TYPES.forEach(type => {
        const meta = TOOL_META[type.toUpperCase()] || TOOL_META[type]; // Handle varying case if needed, though definitions seem consistent
        if (meta) {
            expectedDistribution[type] = (meta.weight / totalWeight) * 100;
        }
    });

    // 2. Calculate Actual Usage
    const toolCounts: Record<string, number> = {};
    let totalTools = 0;
    const uniqueToolSets = new Set<string>();

    candidates.forEach(c => {
        // Track unique sets
        const sortedTools = [...c.tools].sort().join(',');
        uniqueToolSets.add(sortedTools);

        // Track individual tool usage
        c.tools.forEach(t => {
            toolCounts[t] = (toolCounts[t] || 0) + 1;
            totalTools++;
        });
    });

    const toolStats = ALL_TOOL_TYPES.map(type => {
        const count = toolCounts[type] || 0;
        const actualPercent = totalTools > 0 ? (count / totalTools) * 100 : 0;
        const targetPercent = expectedDistribution[type] || 0;

        return {
            Tool: type,
            Count: count,
            'Actual %': actualPercent.toFixed(2) + '%',
            'Target %': targetPercent.toFixed(2) + '%',
            'Delta %': (actualPercent - targetPercent).toFixed(2) + '%'
        };
    });

    // Sort by largest negative delta (under-represented) to largest positive delta
    toolStats.sort((a, b) => parseFloat(a['Delta %']) - parseFloat(b['Delta %']));

    console.table(toolStats);
    console.log(`Total Tools Processed: ${totalTools}`);
    console.log(`Unique Tool Sets (Combinations): ${uniqueToolSets.size} / ${candidates.length}`);

    // --- Solution Mode Analysis ---
    let ascCount = 0;
    let descCount = 0;

    candidates.forEach(c => {
        if (c.solvedState && c.solvedState.length >= 2) {
            // Logic matches gameLogic.ts: if (currentVal >= prevVal) -> ASC
            if (c.solvedState[1] >= c.solvedState[0]) {
                ascCount++;
            } else {
                descCount++;
            }
        }
    });

    const totalSolutions = ascCount + descCount;
    const ascPercent = totalSolutions > 0 ? ((ascCount / totalSolutions) * 100).toFixed(1) : '0.0';
    const descPercent = totalSolutions > 0 ? ((descCount / totalSolutions) * 100).toFixed(1) : '0.0';

    console.log('\n--- Solution Mode Analysis ---');
    console.log(`Ascending:  ${ascCount} (${ascPercent}%)`);
    console.log(`Descending: ${descCount} (${descPercent}%)`);

    // Find and print Min Yield Delta candidate
    const yieldDeltas = candidates.map(c => c.metrics.maxYield - c.metrics.initialYield);
    const minDelta = Math.min(...yieldDeltas);
    const minDeltaCandidates = candidates.filter(c => (c.metrics.maxYield - c.metrics.initialYield) === minDelta);

    console.log(`\n--- Min Yield Delta Candidate(s) (Delta: ${minDelta}) ---`);
    minDeltaCandidates.forEach((c, idx) => {
        console.log(`[${idx + 1}] Initial: [${c.initialSequence}], Solved: [${c.solvedState}]`);
        console.log(`    Tools: ${c.tools.join(', ')}`);
        console.log(`    Metrics: Initial ${c.metrics.initialYield} -> Max ${c.metrics.maxYield}`); // Note: initialYield usage here was bugged in original script, fixed it to use correct path or metrics object if available. Oh wait, previous code accessed c.metrics.initialYield. corrected.
    });
}

analyze();
