import { applyMove } from '../moves.ts';
import { TOOL_REGISTRY } from '../tools/index.ts';
import { generateRunSequence } from './runGeneration.ts';
import { canAffordTool, findRunTool, getSequenceOutcome } from './runSelectors.ts';
import { RunConfig, RunState, SequenceState, ShiftResult, ShiftState } from './runTypes.ts';

const validateConfig = (config: RunConfig): void => {
  if (config.quotaCurve.length === 0) {
    throw new Error('RunConfig.quotaCurve must contain at least one shift quota.');
  }
  if (config.sequencesPerShift < 1) {
    throw new Error(`RunConfig.sequencesPerShift must be at least 1, received ${config.sequencesPerShift}.`);
  }
  if (config.starsPerSequence < 0 || config.starsPerSequence > config.starPoolSize) {
    throw new Error(
      `RunConfig.starsPerSequence must be between 0 and starPoolSize (${config.starPoolSize}), received ${config.starsPerSequence}.`
    );
  }
  if (config.strikeLimit < 1) {
    throw new Error(`RunConfig.strikeLimit must be at least 1, received ${config.strikeLimit}.`);
  }
  if (config.energy.startingEnergy < 0 || config.energy.startingEnergy > config.energy.capacity) {
    throw new Error(
      `RunConfig.energy.startingEnergy must be between 0 and capacity (${config.energy.capacity}), received ${config.energy.startingEnergy}.`
    );
  }
};

const loadSequence = (seed: number, config: RunConfig, shiftIndex: number, sequenceIndex: number): SequenceState => ({
  cards: generateRunSequence(seed, config, shiftIndex, sequenceIndex),
  moves: [],
});

const startShift = (config: RunConfig, shiftIndex: number, carriedDeficit: number): ShiftState => ({
  index: shiftIndex,
  sequenceIndex: 0,
  quota: config.quotaCurve[shiftIndex] + carriedDeficit,
  bankedYield: 0,
  sequencesBelowTarget: 0,
  favorsEarned: 0,
});

const restoreEnergy = (run: RunState, amount: number): number =>
  Math.min(run.config.energy.capacity, run.energy + amount);

export const createRun = (seed: number, config: RunConfig): RunState => {
  validateConfig(config);

  return {
    seed,
    config,
    status: 'IN_PROGRESS',
    strikes: 0,
    favors: 0,
    energy: config.energy.startingEnergy,
    tools: config.loadout.map((entry, position) => ({
      ...entry,
      id: `tool-${position}-${entry.type}`,
    })),
    shift: startShift(config, 0, 0),
    sequence: loadSequence(seed, config, 0, 0),
    completedShifts: [],
  };
};

export const canApplyRunMove = (run: RunState, toolId: string, index: number, selection?: number): boolean => {
  const tool = findRunTool(run, toolId);
  if (run.status !== 'IN_PROGRESS' || tool === undefined || !canAffordTool(run, toolId)) return false;
  return TOOL_REGISTRY[tool.type].isValid(run.sequence.cards, index, selection);
};

/** Pays for a tool and uses it on the current sequence. An illegal move is a caller bug, so it throws. */
export const applyRunMove = (run: RunState, toolId: string, index: number, selection?: number): RunState => {
  const tool = findRunTool(run, toolId);
  if (tool === undefined || !canApplyRunMove(run, toolId, index, selection)) {
    throw new Error(
      `Illegal run move: tool "${toolId}" at index ${index}, selection ${selection}, energy ${run.energy}, run status ${run.status}.`
    );
  }

  const { newList } = applyMove(run.sequence.cards, tool.type, index, selection);
  const energySpent = tool.cost;

  return {
    ...run,
    energy: run.energy - energySpent,
    sequence: {
      cards: newList,
      moves: [...run.sequence.moves, { toolId, index, selection, energySpent, cardsBefore: run.sequence.cards }],
    },
  };
};

/** Takes back the latest move of the current sequence, refunding its energy. */
export const undoRunMove = (run: RunState): RunState => {
  const lastMove = run.sequence.moves.at(-1);
  if (run.status !== 'IN_PROGRESS' || lastMove === undefined) return run;

  return {
    ...run,
    energy: run.energy + lastMove.energySpent,
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
    quota: shift.quota,
    bankedYield: shift.bankedYield,
    wasQuotaMet,
    sequencesBelowTarget: shift.sequencesBelowTarget,
    favorsEarned: shift.favorsEarned,
  };
  const strikes = run.strikes + (wasQuotaMet ? 0 : 1);
  const closedRun: RunState = { ...run, shift, strikes, completedShifts: [...run.completedShifts, result] };

  if (strikes >= run.config.strikeLimit) return { ...closedRun, status: 'LOST' };

  const nextShiftIndex = shift.index + 1;
  if (nextShiftIndex >= run.config.quotaCurve.length) return { ...closedRun, status: 'WON' };

  const carriedDeficit = wasQuotaMet ? 0 : shift.quota - shift.bankedYield;
  return {
    ...closedRun,
    energy: restoreEnergy(run, run.config.energy.shiftBonus),
    shift: startShift(run.config, nextShiftIndex, carriedDeficit),
    sequence: loadSequence(run.seed, run.config, nextShiftIndex, 0),
  };
};

/** Runs the sort on the current sequence, banks its yield and favors, and moves the run forward. */
export const submitSequence = (run: RunState): RunState => {
  if (run.status !== 'IN_PROGRESS') return run;

  const outcome = getSequenceOutcome(run);
  const shift: ShiftState = {
    ...run.shift,
    bankedYield: run.shift.bankedYield + outcome.yield,
    sequencesBelowTarget: run.shift.sequencesBelowTarget + (outcome.isBelowTarget ? 1 : 0),
    favorsEarned: run.shift.favorsEarned + outcome.favorsEarned,
  };
  const scoredRun: RunState = { ...run, favors: run.favors + outcome.favorsEarned };
  const nextSequenceIndex = shift.sequenceIndex + 1;

  if (nextSequenceIndex >= run.config.sequencesPerShift) return closeShift(scoredRun, shift);

  return {
    ...scoredRun,
    energy: restoreEnergy(run, run.config.energy.perSequence),
    shift: { ...shift, sequenceIndex: nextSequenceIndex },
    sequence: loadSequence(run.seed, run.config, shift.index, nextSequenceIndex),
  };
};
