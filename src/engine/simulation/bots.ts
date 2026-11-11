import { generateRunSequence } from '../run/runGeneration.ts';
import { findRunTool, getPaceHint, getReadyTools } from '../run/runSelectors.ts';
import { applyRunMove } from '../run/runTransitions.ts';
import { RunState, RunTool } from '../run/runTypes.ts';
import { ISortable } from '../types.ts';
import { PlannedStep, planSequence, sumPlannedGain } from './sequencePlanner.ts';

/** A bot decides which tools to spend on the current sequence; the simulator submits it. */
export interface Bot {
  name: string;
  playSequence(run: RunState): RunState;
}

const applySteps = (run: RunState, steps: PlannedStep[]): RunState =>
  steps.reduce((current, step) => applyRunMove(current, step.toolId, step.index, step.selection), run);

/** Never uses a tool. Its results are the floor every other bot is measured against. */
export const idleBot: Bot = {
  name: 'idle',
  playSequence: run => run,
};

/** Spends every ready tool that gains anything, with no thought for later sequences. */
export const greedyBot: Bot = {
  name: 'greedy',
  playSequence: run => applySteps(run, planSequence(run.sequence.cards, getReadyTools(run))),
};

const isWorthSpending = (tool: RunTool, gain: number, minGainPerLockedSequence: number): boolean =>
  gain >= minGainPerLockedSequence * tool.cooldown;

const planPatiently = (run: RunState, minGainPerLockedSequence: number): PlannedStep[] => {
  let candidateTools = getReadyTools(run);

  // Dropping a tool changes what the remaining tools can gain, so replan after each rejection.
  while (true) {
    const steps = planSequence(run.sequence.cards, candidateTools);
    const rejected = steps.find(step => {
      const tool = findRunTool(run, step.toolId);
      return tool !== undefined && !isWorthSpending(tool, step.gain, minGainPerLockedSequence);
    });
    if (rejected === undefined) return steps;
    candidateTools = candidateTools.filter(tool => tool.id !== rejected.toolId);
  }
};

/**
 * Holds a tool back unless its gain justifies the sequences it will be locked
 * for, and spends freely once the pace hint says the shift is winding down.
 * It sees only what a player sees.
 */
export const createPatientBot = (minGainPerLockedSequence: number): Bot => ({
  name: `patient(${minGainPerLockedSequence})`,
  playSequence: run =>
    getPaceHint(run) === 'WINDING_DOWN'
      ? greedyBot.playSequence(run)
      : applySteps(run, planPatiently(run, minGainPerLockedSequence)),
});

interface ShiftSchedule {
  totalGain: number;
  /** Planned steps for each remaining sequence, first entry being the current one. */
  stepsBySequence: PlannedStep[][];
}

const EMPTY_SCHEDULE: ShiftSchedule = { totalGain: 0, stepsBySequence: [] };

const listSubsets = <T>(items: T[]): T[][] =>
  items.reduce<T[][]>((subsets, item) => [...subsets, ...subsets.map(subset => [...subset, item])], [[]]);

/**
 * Finds the tool schedule with the highest total gain over the rest of the
 * shift, knowing every upcoming sequence and when the shift ends.
 */
const scheduleShift = (run: RunState): ShiftSchedule => {
  const { shift, seed, config } = run;
  const sequences: ISortable[][] = [];
  for (let sequenceIndex = shift.sequenceIndex; sequenceIndex < shift.sequenceCount; sequenceIndex++) {
    sequences.push(
      sequenceIndex === shift.sequenceIndex
        ? run.sequence.cards
        : generateRunSequence(seed, config, shift.index, sequenceIndex)
    );
  }

  const planCache = new Map<string, PlannedStep[]>();
  const planWith = (position: number, tools: RunTool[]): PlannedStep[] => {
    const key = `${position}|${tools.map(tool => tool.id).join(',')}`;
    let steps = planCache.get(key);
    if (steps === undefined) {
      steps = planSequence(sequences[position], tools);
      planCache.set(key, steps);
    }
    return steps;
  };

  const scheduleCache = new Map<string, ShiftSchedule>();
  const scheduleFrom = (position: number, readiness: number[]): ShiftSchedule => {
    if (position >= sequences.length) return EMPTY_SCHEDULE;

    const key = `${position}|${readiness.join(',')}`;
    const cached = scheduleCache.get(key);
    if (cached !== undefined) return cached;

    const readyTools = run.tools.filter((_, toolPosition) => readiness[toolPosition] === 0);
    let best: ShiftSchedule | null = null;

    for (const allowedTools of listSubsets(readyTools)) {
      const steps = planWith(position, allowedTools);
      const usedToolIds = new Set(steps.map(step => step.toolId));
      const nextReadiness = run.tools.map((tool, toolPosition) =>
        usedToolIds.has(tool.id) ? tool.cooldown : Math.max(0, readiness[toolPosition] - 1)
      );
      const rest = scheduleFrom(position + 1, nextReadiness);
      const totalGain = sumPlannedGain(steps) + rest.totalGain;

      if (best === null || totalGain > best.totalGain) {
        best = { totalGain, stepsBySequence: [steps, ...rest.stepsBySequence] };
      }
    }

    const result = best ?? EMPTY_SCHEDULE;
    scheduleCache.set(key, result);
    return result;
  };

  return scheduleFrom(0, run.tools.map(tool => tool.sequencesUntilReady));
};

/**
 * Plays with perfect foresight of the current shift. It uses the same
 * per-sequence planner as the other bots, so the gap between it and them
 * measures only the value of knowing what is coming.
 */
export const oracleBot: Bot = {
  name: 'oracle',
  playSequence: run => applySteps(run, scheduleShift(run).stepsBySequence[0] ?? []),
};
