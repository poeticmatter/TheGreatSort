import { calculateBatchScore } from '../grading.ts';
import { applyMove } from '../moves.ts';
import { TOOL_REGISTRY } from '../tools/index.ts';
import { generateRunSequence, generateShiftSequenceCount } from './runGeneration.ts';
import { findRunTool, isToolReady, isToolUsedThisSequence } from './runSelectors.ts';
import { RunConfig, RunState, RunTool, SequenceState, ShiftResult, ShiftState } from './runTypes.ts';

const validateConfig = (config: RunConfig): void => {
  if (config.quotaCurve.length === 0) {
    throw new Error('RunConfig.quotaCurve must contain at least one shift quota.');
  }
  if (config.minSequencesPerShift < 1 || config.maxSequencesPerShift < config.minSequencesPerShift) {
    throw new Error(
      `RunConfig sequence bounds are invalid: min ${config.minSequencesPerShift}, max ${config.maxSequencesPerShift}.`
    );
  }
  if (config.strikeLimit < 1) {
    throw new Error(`RunConfig.strikeLimit must be at least 1, received ${config.strikeLimit}.`);
  }
};

const loadSequence = (seed: number, config: RunConfig, shiftIndex: number, sequenceIndex: number): SequenceState => ({
  cards: generateRunSequence(seed, config, shiftIndex, sequenceIndex),
  moves: [],
});

const startShift = (seed: number, config: RunConfig, shiftIndex: number, carriedDeficit: number): ShiftState => ({
  index: shiftIndex,
  sequenceCount: generateShiftSequenceCount(seed, config, shiftIndex),
  sequenceIndex: 0,
  quota: config.quotaCurve[shiftIndex] + carriedDeficit,
  bankedYield: 0,
});

const refreshTools = (tools: RunTool[]): RunTool[] =>
  tools.map(tool => ({ ...tool, sequencesUntilReady: 0 }));

/** Tools used in the sequence just submitted start cooling; the rest move one sequence closer to ready. */
const tickCooldowns = (run: RunState): RunTool[] =>
  run.tools.map(tool => ({
    ...tool,
    sequencesUntilReady: isToolUsedThisSequence(run, tool.id)
      ? tool.cooldown
      : Math.max(0, tool.sequencesUntilReady - 1),
  }));

export const createRun = (seed: number, config: RunConfig): RunState => {
  validateConfig(config);

  return {
    seed,
    config,
    status: 'IN_PROGRESS',
    strikes: 0,
    tools: config.loadout.map((entry, position) => ({
      ...entry,
      id: `tool-${position}-${entry.type}`,
      sequencesUntilReady: 0,
    })),
    shift: startShift(seed, config, 0, 0),
    sequence: loadSequence(seed, config, 0, 0),
    completedShifts: [],
  };
};

export const canApplyRunMove = (run: RunState, toolId: string, index: number, selection?: number): boolean => {
  const tool = findRunTool(run, toolId);
  if (run.status !== 'IN_PROGRESS' || tool === undefined || !isToolReady(run, toolId)) return false;
  return TOOL_REGISTRY[tool.type].isValid(run.sequence.cards, index, selection);
};

/** Uses a ready tool on the current sequence. An illegal move is a caller bug, so it throws. */
export const applyRunMove = (run: RunState, toolId: string, index: number, selection?: number): RunState => {
  const tool = findRunTool(run, toolId);
  if (tool === undefined || !canApplyRunMove(run, toolId, index, selection)) {
    throw new Error(
      `Illegal run move: tool "${toolId}" at index ${index}, selection ${selection}, run status ${run.status}.`
    );
  }

  const { newList } = applyMove(run.sequence.cards, tool.type, index, selection);

  return {
    ...run,
    sequence: {
      cards: newList,
      moves: [...run.sequence.moves, { toolId, index, selection, cardsBefore: run.sequence.cards }],
    },
  };
};

/** Takes back the latest move of the current sequence, making its tool ready again. */
export const undoRunMove = (run: RunState): RunState => {
  const lastMove = run.sequence.moves.at(-1);
  if (run.status !== 'IN_PROGRESS' || lastMove === undefined) return run;

  return {
    ...run,
    sequence: {
      cards: lastMove.cardsBefore,
      moves: run.sequence.moves.slice(0, -1),
    },
  };
};

const closeShift = (run: RunState, shift: ShiftState): RunState => {
  const wasQuotaMet = shift.bankedYield >= shift.quota;
  const result: ShiftResult = {
    shiftIndex: shift.index,
    sequenceCount: shift.sequenceCount,
    quota: shift.quota,
    bankedYield: shift.bankedYield,
    wasQuotaMet,
  };
  const strikes = run.strikes + (wasQuotaMet ? 0 : 1);
  const closedRun: RunState = { ...run, shift, strikes, completedShifts: [...run.completedShifts, result] };

  if (strikes >= run.config.strikeLimit) return { ...closedRun, status: 'LOST' };

  const nextShiftIndex = shift.index + 1;
  if (nextShiftIndex >= run.config.quotaCurve.length) return { ...closedRun, status: 'WON' };

  const carriedDeficit = wasQuotaMet ? 0 : shift.quota - shift.bankedYield;
  return {
    ...closedRun,
    tools: refreshTools(run.tools),
    shift: startShift(run.seed, run.config, nextShiftIndex, carriedDeficit),
    sequence: loadSequence(run.seed, run.config, nextShiftIndex, 0),
  };
};

/** Runs the sort on the current sequence, banks its yield, and moves the run forward. */
export const submitSequence = (run: RunState): RunState => {
  if (run.status !== 'IN_PROGRESS') return run;

  const shift: ShiftState = {
    ...run.shift,
    bankedYield: run.shift.bankedYield + calculateBatchScore(run.sequence.cards),
  };
  const nextSequenceIndex = shift.sequenceIndex + 1;

  if (nextSequenceIndex >= shift.sequenceCount) return closeShift(run, shift);

  return {
    ...run,
    tools: tickCooldowns(run),
    shift: { ...shift, sequenceIndex: nextSequenceIndex },
    sequence: loadSequence(run.seed, run.config, shift.index, nextSequenceIndex),
  };
};
