import { findOptimalSolution } from '../src/utils/gameLogic';
import { CardItem, ToolType } from '../types';

const list: CardItem[] = [
    { id: '1', val: 10, status: 'pending', linkScore: null },
    { id: '2', val: 20, status: 'pending', linkScore: null },
    { id: '3', val: 5, status: 'pending', linkScore: null }
];

const tools: ToolType[] = ['consolidate', 'equalize'];

console.log("Starting test...");
console.log("List:", list.map(i => i.val));
console.log("Tools:", tools);

// Expected:
// Order Equalize(0) -> [10, 10, 5]. Then Consolidate(0) -> [20, 5]. Score 25.
// Order Consolidate(0) -> [30, 5]. Then Equalize(0) -> [5, 5]. Score 10.
// Max Score should be 25.

const solution = findOptimalSolution(list, tools);

console.log('Found Score:', solution.score);
console.log('Moves:', JSON.stringify(solution.moves, null, 2));

if (solution.score === 25) {
    console.log("SUCCESS: Solver found the optimal order.");
} else {
    console.log("FAILURE: Solver missed the optimal order.");
}
