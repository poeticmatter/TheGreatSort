import { applyMove } from '../src/utils/gameLogic';
import { ALL_TOOL_TYPES } from '../src/constants';
import { ToolType, ISortable } from '../types';

interface TestCase {
    name: string;
    input: ISortable[];
    tool: ToolType;
    index: number;
    selection?: number;
    expected: ISortable[];
}

const tests: TestCase[] = [
    // Standard
    {
        name: "Swap swaps adjacent items",
        input: [{val: 10}, {val: 20}, {val: 30}],
        tool: 'swap',
        index: 0,
        expected: [{val: 20}, {val: 10}, {val: 30}]
    },
    {
        name: "Demote moves item to start",
        input: [{val: 10}, {val: 20}, {val: 30}],
        tool: 'demote',
        index: 2,
        expected: [{val: 30}, {val: 10}, {val: 20}]
    },
    {
        name: "Promote moves item to end",
        input: [{val: 10}, {val: 20}, {val: 30}],
        tool: 'promote',
        index: 0,
        expected: [{val: 20}, {val: 30}, {val: 10}]
    },
    {
        name: "Purge removes item",
        input: [{val: 10}, {val: 20}, {val: 30}],
        tool: 'purge',
        index: 1,
        expected: [{val: 10}, {val: 30}]
    },

    // Math
    {
        name: "Halve divides value by 2 (floored)",
        input: [{val: 15}],
        tool: 'halve',
        index: 0,
        expected: [{val: 7}]
    },
    {
        name: "Grow adds 3",
        input: [{val: 10}],
        tool: 'grow',
        index: 0,
        expected: [{val: 13}]
    },
    {
        name: "Shrink subtracts 3",
        input: [{val: 10}],
        tool: 'shrink',
        index: 0,
        expected: [{val: 7}]
    },

    // Complex
    {
        name: "Merge sums adjacent items and removes second",
        input: [{val: 10}, {val: 20}, {val: 30}],
        tool: 'merge',
        index: 0,
        expected: [{val: 30}, {val: 30}]
    },
    {
        name: "Sink sets adjacent items to min value",
        input: [{val: 30}, {val: 10}],
        tool: 'sink',
        index: 0,
        expected: [{val: 10}, {val: 10}]
    },
    {
        name: "Float sets adjacent items to max value",
        input: [{val: 30}, {val: 10}],
        tool: 'float',
        index: 0,
        expected: [{val: 30}, {val: 30}]
    },

    // Positional
    {
        name: "Longswap swaps non-adjacent items",
        input: [{val: 10}, {val: 20}, {val: 30}, {val: 40}],
        tool: 'longswap',
        index: 0,
        selection: 3,
        expected: [{val: 40}, {val: 20}, {val: 30}, {val: 10}]
    },
    {
        name: "Hop swaps i-1 and i+1",
        input: [{val: 10}, {val: 20}, {val: 30}, {val: 40}],
        tool: 'hop',
        index: 2,
        expected: [{val: 10}, {val: 40}, {val: 30}, {val: 20}] // Swap 20 (index 1) and 40 (index 3)
    },
    {
        name: "Mirror swaps with symmetric index",
        input: [{val: 10}, {val: 20}, {val: 30}, {val: 40}], // Length 4. Mirror(0) -> 3. Mirror(1) -> 2.
        tool: 'mirror',
        index: 0,
        expected: [{val: 40}, {val: 20}, {val: 30}, {val: 10}]
    },

    // Status
    {
        name: "Shield adds shield property",
        input: [{val: 10}],
        tool: 'shield',
        index: 0,
        expected: [{val: 10, hasShield: true}]
    }
];

const testedTools = new Set<string>();

let passed = 0;
let failed = 0;

console.log("Running Mechanics Tests...\n");

tests.forEach((t, i) => {
    testedTools.add(t.tool);
    const result = applyMove(t.input, t.tool, t.index, t.selection);

    // Simple JSON comparison
    const expectedStr = JSON.stringify(t.expected);
    const actualStr = JSON.stringify(result);

    if (expectedStr === actualStr) {
        console.log(`✅ [${t.tool.toUpperCase()}] ${t.name}`);
        passed++;
    } else {
        console.error(`❌ [${t.tool.toUpperCase()}] ${t.name}`);
        console.error(`   Expected: ${expectedStr}`);
        console.error(`   Actual:   ${actualStr}`);
        failed++;
    }
});

// Verify coverage
console.log("\nVerifying Tool Coverage...");
const missingTools = ALL_TOOL_TYPES.filter(type => !testedTools.has(type));

if (missingTools.length > 0) {
    console.error(`❌ Missing tests for tools: ${missingTools.join(', ')}`);
    failed++;
} else {
    console.log("✅ All tools covered.");
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);

if (failed > 0) process.exit(1);
