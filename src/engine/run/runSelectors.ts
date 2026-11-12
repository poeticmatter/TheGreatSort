import { calculateBatchScore, countStarredSurvivors } from '../grading.ts';
import { RunState, RunTool, SequenceOutcome } from './runTypes.ts';

export const findRunTool = (run: RunState, toolId: string): RunTool | undefined =>
  run.tools.find(tool => tool.id === toolId);

export const canAffordTool = (run: RunState, toolId: string): boolean => {
  const tool = findRunTool(run, toolId);
  return tool !== undefined && tool.cost <= run.energy;
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
