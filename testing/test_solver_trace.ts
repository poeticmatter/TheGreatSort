import { CardItem, ToolType, ISortable } from '../types';
import { calculateBatchScore, Move } from '../src/utils/gameLogic';

// Copy of findOptimalSolution with logging
const findOptimalSolutionTrace = (startList: CardItem[], availableTools: ToolType[]): { maxScore: number, paths: string[] } => {
  const initialNums: ISortable[] = startList.map(item => ({ val: item.val, hasShield: item.hasShield }));
  
  let maxScore = -1;
  const paths: string[] = [];

  const search = (currentNums: ISortable[], currentTools: ToolType[], currentMoves: Move[]) => {
    const currentScore = calculateBatchScore(currentNums);
    if (currentScore > maxScore) {
      maxScore = currentScore;
    }

    // Log the current path of tools used
    const pathStr = currentMoves.map(m => m.tool).join(' -> ');
    if (pathStr) paths.push(pathStr + ` (Score: ${currentScore})`);

    if (currentTools.length === 0) return;

    for (let t = 0; t < currentTools.length; t++) {
      const tool = currentTools[t];
      const nextTools = [...currentTools];
      nextTools.splice(t, 1); 

      // Simplified tool logic to just traverse recursion structure
      // We don't need full tool implementation to verify tool order TRAVERSAL,
      // but we need to pass valid nextNums to avoid crashes/infinite loops if logic depends on it.
      // For this trace, we'll just assume tools verify 1 branch/move for simplicity to check tool PERMUTATION.
      // Actually, let's keep it simple: we just want to see the "Tool Selection" order.
      
      // Fake move to advance recursion
      search(currentNums, nextTools, [...currentMoves, { tool, index: 0, description: 'scan' }]);
    }
  };

  search(initialNums, availableTools, []);
  return { maxScore, paths };
};

const list: CardItem[] = [
    { id: '1', val: 10, status: 'pending', linkScore: null }
];

const tools: ToolType[] = ['merge', 'sink'];

console.log("Tracing solver exploration...");
const result = findOptimalSolutionTrace(list, tools);
console.log("Paths explored:");
result.paths.forEach(p => console.log(p));
