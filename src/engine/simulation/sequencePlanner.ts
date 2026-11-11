import { calculateBatchScore } from '../grading.ts';
import { TOOL_REGISTRY } from '../tools/index.ts';
import { ISortable, ToolType } from '../types.ts';

export interface PlannableTool {
  id: string;
  type: ToolType;
}

export interface PlannedStep {
  toolId: string;
  index: number;
  selection?: number;
  /** Yield gained by this step over the sequence as it stood before it. */
  gain: number;
}

interface Candidate extends PlannedStep {
  cards: ISortable[];
}

const findBestSingleStep = (cards: ISortable[], tools: PlannableTool[]): Candidate | null => {
  const currentYield = calculateBatchScore(cards);
  let best: Candidate | null = null;

  for (const tool of tools) {
    const strategy = TOOL_REGISTRY[tool.type];
    for (const move of strategy.generateMoves(cards)) {
      const nextCards = strategy.apply(cards, move.index, move.targetIndex);
      const gain = calculateBatchScore(nextCards) - currentYield;
      if (gain > 0 && (best === null || gain > best.gain)) {
        best = { toolId: tool.id, index: move.index, selection: move.targetIndex, gain, cards: nextCards };
      }
    }
  }
  return best;
};

/**
 * Plans a sequence by hill climbing: repeatedly take the single tool use with
 * the largest immediate yield gain until none helps. It misses combinations
 * whose first move gains nothing, which is acceptable here: every bot shares
 * this planner, so differences between bots come from *when* they spend
 * tools, not from how well they use them. It is also far cheaper than the
 * exhaustive solver, which matters across thousands of simulated runs.
 */
export const planSequence = (cards: ISortable[], tools: PlannableTool[]): PlannedStep[] => {
  const steps: PlannedStep[] = [];
  let currentCards = cards;
  let remainingTools = tools;

  while (remainingTools.length > 0) {
    const best = findBestSingleStep(currentCards, remainingTools);
    if (best === null) break;

    const { cards: nextCards, ...step } = best;
    steps.push(step);
    currentCards = nextCards;
    remainingTools = remainingTools.filter(tool => tool.id !== best.toolId);
  }
  return steps;
};

export const sumPlannedGain = (steps: PlannedStep[]): number =>
  steps.reduce((total, step) => total + step.gain, 0);
