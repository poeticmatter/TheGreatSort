import { findOptimalSolution } from '../src/utils/gameLogic';
import { CardItem, ToolType } from '../types';

const list: CardItem[] = [
    { id: '1', val: 10, status: 'pending', linkScore: null },
    { id: '2', val: 20, status: 'pending', linkScore: null },
    { id: '3', val: 5, status: 'pending', linkScore: null }
];

const tools: ToolType[] = ['merge', 'sink'];

console.log("Starting test...");
console.log("List:", list.map(i => i.val));
console.log("Tools:", tools);

// Expected:
// Order Sink(0) -> [10, 10, 5]. Then Merge(0) -> [20, 5]. Score 25.
// Order Merge(0) -> [30, 5]. Score 35 (30 survives + 5 survives DESC).
// Max Score should be 35.

const solution = findOptimalSolution(list, tools);

console.log('Found Score:', solution.score);
console.log('Moves:', JSON.stringify(solution.moves, null, 2));

if (solution.score === 35) {
    console.log("SUCCESS: Solver found the optimal order.");
} else {
    console.log("FAILURE: Solver missed the optimal order.");
}
