import { solve, SolverItem } from './solver.ts';
import { CardItem, Move, ToolInstance, ToolType } from './types.ts';

export interface Solution {
  score: number;
  moves: Move[];
}

type SolverObjective = 'MAX' | 'MIN';

// Legacy fallback for callers that do not know the puzzle's toolset.
const DEFAULT_TOOL_TYPES: ToolType[] = ['swap', 'promote', 'demote'];

const findSolution = (startList: CardItem[], availableTools: ToolType[], objective: SolverObjective): Solution => {
  const sequence: SolverItem[] = startList.map(item => ({ val: item.val, hasShield: item.hasShield }));

  const result = solve(sequence, availableTools, objective);

  const moves: Move[] = result.bestSolution.map(solverMove => ({
    tool: solverMove.tool,
    index: solverMove.i,
    targetIndex: solverMove.t,
    description: ''
  }));

  return { score: result.maxYield, moves };
};

const getUnusedToolTypes = (availableTools?: ToolInstance[]): ToolType[] =>
  availableTools ? availableTools.filter(tool => !tool.used).map(tool => tool.type) : DEFAULT_TOOL_TYPES;

/** The highest reachable yield and a shortest path to it. */
export const findOptimalSolution = (startList: CardItem[], availableTools: ToolType[]): Solution =>
  findSolution(startList, availableTools, 'MAX');

/** The lowest reachable yield and a shortest path to it. */
export const findWorstSolution = (startList: CardItem[], availableTools: ToolType[]): Solution =>
  findSolution(startList, availableTools, 'MIN');

export const findOptimalScore = (startList: CardItem[], availableTools?: ToolInstance[]): number =>
  findOptimalSolution(startList, getUnusedToolTypes(availableTools)).score;

export const findWorstScore = (startList: CardItem[], availableTools?: ToolInstance[]): number =>
  findWorstSolution(startList, getUnusedToolTypes(availableTools)).score;
