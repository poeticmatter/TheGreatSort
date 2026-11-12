import { listSurvivors } from '../grading.ts';
import { TOOL_REGISTRY } from '../tools/index.ts';
import { ISortable, ToolType } from '../types.ts';

export interface PlannableTool {
  id: string;
  type: ToolType;
  /** Energy per use. The planner prefers the use with the most gain per point of energy. */
  cost: number;
}

export interface PlannedStep {
  toolId: string;
  index: number;
  selection?: number;
  /** Value gained by this step over the sequence as it stood before it. */
  gain: number;
}

interface Candidate extends PlannedStep {
  cards: ISortable[];
  gainPerEnergy: number;
}

/**
 * What a bot is trying to maximise on a sequence: its yield, plus
 * `favorValue` for every starred card that survives. A favorValue of 0
 * ignores stars entirely.
 */
const valueSequence = (cards: ISortable[], favorValue: number): number =>
  listSurvivors(cards).reduce((total, card) => total + card.val + (card.isStarred ? favorValue : 0), 0);

const findBestSingleStep = (cards: ISortable[], tools: PlannableTool[], favorValue: number): Candidate | null => {
  const currentValue = valueSequence(cards, favorValue);
  let best: Candidate | null = null;

  for (const tool of tools) {
    const strategy = TOOL_REGISTRY[tool.type];
    for (const move of strategy.generateMoves(cards)) {
      const nextCards = strategy.apply(cards, move.index, move.targetIndex);
      const gain = valueSequence(nextCards, favorValue) - currentValue;
      const gainPerEnergy = gain / tool.cost;
      if (gain > 0 && (best === null || gainPerEnergy > best.gainPerEnergy)) {
        best = { toolId: tool.id, index: move.index, selection: move.targetIndex, gain, gainPerEnergy, cards: nextCards };
      }
    }
  }
  return best;
};

// No bot can pay for more uses than this on one sequence, so planning further is wasted work.
const MAX_PLANNED_STEPS = 6;

/**
 * Plans a sequence by hill climbing: repeatedly take the single tool use with
 * the most immediate gain per point of energy until none helps. The result is
 * an ordered wish list that ignores the energy available; each bot decides
 * how far down it to pay.
 *
 * It misses combinations whose first move gains nothing. That is acceptable here: every
 * bot shares this planner, so differences between bots come from *when* they
 * spend energy and *what* they value, not from how well they use a tool. It
 * is also far cheaper than the exhaustive solver, which matters across
 * thousands of runs.
 */
export const planSequence = (cards: ISortable[], tools: PlannableTool[], favorValue: number): PlannedStep[] => {
  const steps: PlannedStep[] = [];
  let currentCards = cards;

  while (steps.length < MAX_PLANNED_STEPS) {
    const best = findBestSingleStep(currentCards, tools, favorValue);
    if (best === null) break;

    steps.push({ toolId: best.toolId, index: best.index, selection: best.selection, gain: best.gain });
    currentCards = best.cards;
  }
  return steps;
};