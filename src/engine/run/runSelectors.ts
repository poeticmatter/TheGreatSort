import { PaceHint, RunState, RunTool } from './runTypes.ts';

const EARLY_PROGRESS_LIMIT = 1 / 3;
const MIDWAY_PROGRESS_LIMIT = 2 / 3;

export const findRunTool = (run: RunState, toolId: string): RunTool | undefined =>
  run.tools.find(tool => tool.id === toolId);

export const isToolUsedThisSequence = (run: RunState, toolId: string): boolean =>
  run.sequence.moves.some(move => move.toolId === toolId);

export const isToolReady = (run: RunState, toolId: string): boolean => {
  const tool = findRunTool(run, toolId);
  return tool !== undefined && tool.sequencesUntilReady === 0 && !isToolUsedThisSequence(run, toolId);
};

export const getReadyTools = (run: RunState): RunTool[] =>
  run.tools.filter(tool => isToolReady(run, tool.id));

/**
 * A deliberately vague signal of how far through the shift the player is.
 * It never reveals the exact number of sequences left.
 */
export const getPaceHint = (run: RunState): PaceHint => {
  const progress = run.shift.sequenceIndex / run.shift.sequenceCount;
  if (progress < EARLY_PROGRESS_LIMIT) return 'EARLY';
  if (progress < MIDWAY_PROGRESS_LIMIT) return 'MIDWAY';
  return 'WINDING_DOWN';
};

export const getShiftCount = (run: RunState): number => run.config.quotaCurve.length;
