import { findOptimalSolution } from '../src/utils/gameLogic';
import { CardItem, ToolType } from '../types';

console.log("Starting Smoke Test...");

// Simplified Scenario:
// List: [30, 10, 20]
// Goal: Ascending order.
// Obvious Move: Swap(0) -> [10, 30, 20] -> Score 30 (10 + 20).
// Wait, 10 -> 30 (OK) -> 20 (Fail). Score 10 + 30 = 40.
// Let's check calculation.
// [30, 10, 20].
// 1. 30 (Safe). Score += 30. Last=30.
// 2. 10 (<30). Eliminated.
// 3. 20 (<30). Eliminated.
// Total: 30.

// If Swap(0) -> [10, 30, 20].
// 1. 10 (Safe). Last=10.
// 2. 30 (>=10). Safe. Last=30. Mode=ASC.
// 3. 20 (<30). Eliminated.
// Total: 10 + 30 = 40.

// If Swap(1) -> [30, 20, 10].
// 1. 30.
// 2. 20 (<=30). Safe. Mode=DESC.
// 3. 10 (<=20). Safe.
// Total: 30 + 20 + 10 = 60.

// So Optimal should be Swap(1) -> 60.

const list: CardItem[] = [
    { id: '1', val: 30, status: 'pending', linkScore: null },
    { id: '2', val: 10, status: 'pending', linkScore: null },
    { id: '3', val: 20, status: 'pending', linkScore: null }
];

const tools: ToolType[] = ['swap'];

console.log("List:", list.map(i => i.val));
console.log("Tools:", tools);

const solution = findOptimalSolution(list, tools);

console.log('Found Score:', solution.score);
console.log('Moves:', JSON.stringify(solution.moves, null, 2));

const expectedScore = 60;
if (solution.score === expectedScore) {
    console.log("SUCCESS: Solver found the optimal order.");
} else {
    console.error(`FAILURE: Solver missed the optimal order. Expected ${expectedScore}, got ${solution.score}`);
    process.exit(1);
}
