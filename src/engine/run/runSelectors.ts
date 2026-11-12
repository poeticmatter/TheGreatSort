import { calculateBatchScore, countStarredSurvivors } from '../grading.ts';
import { RunState, RunTool, SequenceOutcome } from './runTypes.ts';

export const findRunTool = (run: RunState, toolId: string): RunTool | undefined =>
  run.tools.find(tool => tool.id === toolId);

/** What the tool's next use costs: its base cost plus a surcharge for every use already made this shift. */
export const getToolCost = (run: RunState, tool: RunTool): number =>
  tool.baseCost + tool.usesThisShift * run.config.energy.repeatUseSurcharge;

export const canAffordTool = (run: RunState, toolId: string): boolean => {
  const tool = findRunTool(run, toolId);
  return tool !== undefined && getToolCost(run, tool) <= run.energy;
};

export const getShiftCount = (run: RunState): number => run.config.quotaCurve.length;

/** An even share of the shift quota: what one sequence must yield to stay on pace. */
export const getSequenceTarget = (run: RunState): number =>
  Math.ceil(run.shift.quota / run.config.sequencesPerShift);

export const getSequenceOutcome = (run: RunState): SequenceOutcome => {
  const sequenceYield = calculateBatchScore(run.sequence.cards);
  const target = getSequenceTarget(run);

  return {
    yield: sequenceYield,
    target,
    isBelowTarget: sequenceYield < target,
    favorsEarned: countStarredSurvivors(run.sequence.cards),
  };
};
