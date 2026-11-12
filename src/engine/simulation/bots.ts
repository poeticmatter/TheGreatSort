import { generateRunSequence } from '../run/runGeneration.ts';
import { applyRunMove } from '../run/runTransitions.ts';
import { RunConfig, RunState } from '../run/runTypes.ts';
import { PlannedStep, planSequence } from './sequencePlanner.ts';

/** A bot decides which tools to spend energy on for the current sequence; the simulator submits it. */
export interface Bot {
  name: string;
  playSequence(run: RunState): RunState;
}

export interface PatientBotOptions {
  /** Minimum gain a tool use must deliver for each point of energy it costs. */
  minGainPerEnergy: number;
  /** Yield the bot would give up to keep one starred card alive. */
  favorValue: number;
}

interface PricedStep extends PlannedStep {
  cost: number;
  /** Energy spent on this step and every step before it. */
  cumulativeCost: number;
}

/** Uses of each tool so far this shift, in the order of `run.tools`. */
type ToolUses = number[];

const describeFavorValue = (favorValue: number): string => (favorValue === 0 ? '' : `, favors worth ${favorValue}`);

const applySteps = (run: RunState, steps: PlannedStep[]): RunState =>
  steps.reduce((current, step) => applyRunMove(current, step.toolId, step.index, step.selection), run);

const readToolUses = (run: RunState): ToolUses => run.tools.map(tool => tool.usesThisShift);

const countUsesAfter = (run: RunState, usesBefore: ToolUses, steps: PlannedStep[]): ToolUses =>
  run.tools.map(
    (tool, toolPosition) => usesBefore[toolPosition] + steps.filter(step => step.toolId === tool.id).length
  );

/** Prices a plan in order, since every use of a tool makes its next use dearer. */
const priceSteps = (run: RunState, steps: PlannedStep[], usesBefore: ToolUses): PricedStep[] => {
  const { repeatUseSurcharge } = run.config.energy;
  let cumulativeCost = 0;

  return steps.map((step, stepPosition) => {
    const toolPosition = run.tools.findIndex(tool => tool.id === step.toolId);
    const uses = countUsesAfter(run, usesBefore, steps.slice(0, stepPosition))[toolPosition];
    const cost = run.tools[toolPosition].baseCost + uses * repeatUseSurcharge;
    cumulativeCost += cost;
    return { ...step, cost, cumulativeCost };
  });
};

const takeStepsWhile = (steps: PricedStep[], isWanted: (step: PricedStep) => boolean): PricedStep[] => {
  const firstUnwanted = steps.findIndex(step => !isWanted(step));
  return firstUnwanted === -1 ? steps : steps.slice(0, firstUnwanted);
};

const planCurrentSequence = (run: RunState, favorValue: number): PricedStep[] =>
  priceSteps(run, planSequence(run.sequence.cards, run.tools, favorValue), readToolUses(run));

/** Never uses a tool. Its results are the floor every other bot is measured against. */
export const idleBot: Bot = {
  name: 'idle',
  playSequence: run => run,
};

/** Spends energy on every use that gains anything, with no thought for later sequences. */
export const createGreedyBot = (favorValue: number): Bot => ({
  name: `greedy${describeFavorValue(favorValue)}`,
  playSequence: run =>
    applySteps(
      run,
      takeStepsWhile(planCurrentSequence(run, favorValue), step => step.cumulativeCost <= run.energy)
    ),
});

const isLastSequenceOfShift = (run: RunState): boolean =>
  run.shift.sequenceIndex === run.config.sequencesPerShift - 1;

const isLastShift = (run: RunState): boolean => run.shift.index === run.config.quotaCurve.length - 1;

/**
 * Energy that is worthless if left unspent on this sequence: whatever the
 * coming restore would push past the cap, or everything at the end of the run.
 */
const countEnergyAboutToBeLost = (run: RunState): number => {
  const { capacity, perSequence, shiftBonus } = run.config.energy;
  if (!isLastSequenceOfShift(run)) return Math.max(0, run.energy + perSequence - capacity);
  return isLastShift(run) ? run.energy : Math.max(0, run.energy + shiftBonus - capacity);
};

const planPatiently = (run: RunState, options: PatientBotOptions): PricedStep[] => {
  const freeEnergy = countEnergyAboutToBeLost(run);

  return takeStepsWhile(planCurrentSequence(run, options.favorValue), step => {
    const isAffordable = step.cumulativeCost <= run.energy;
    const isFree = step.cumulativeCost <= freeEnergy;
    return isAffordable && (isFree || step.gain >= options.minGainPerEnergy * step.cost);
  });
};

/**
 * Saves energy unless a use earns enough per point spent, but never lets
 * energy go to waste against the cap. It sees only what a player sees.
 */
export const createPatientBot = (options: PatientBotOptions): Bot => ({
  name: `patient (min gain ${options.minGainPerEnergy} per energy${describeFavorValue(options.favorValue)})`,
  playSequence: run => applySteps(run, planPatiently(run, options)),
});

interface UpcomingSequence {
  shiftIndex: number;
  steps: PlannedStep[];
}

interface Schedule {
  totalGain: number;
  /** How many steps of the first sequence's plan to play. */
  stepCount: number;
}

type SequencePlanner = (run: RunState, shiftIndex: number, sequenceIndex: number) => PlannedStep[];

const EMPTY_SCHEDULE: Schedule = { totalGain: 0, stepCount: 0 };

/**
 * Plans of sequences the run has not reached yet. The oracle replans the
 * whole run at every sequence, so without this each future sequence would be
 * planned again on every turn. A run's sequences depend only on its seed and
 * config, so the cache is dropped when either changes.
 */
const createSequencePlanner = (favorValue: number): SequencePlanner => {
  const plans = new Map<string, PlannedStep[]>();
  let cachedSeed: number | null = null;
  let cachedConfig: RunConfig | null = null;

  return (run, shiftIndex, sequenceIndex) => {
    if (cachedSeed !== run.seed || cachedConfig !== run.config) {
      plans.clear();
      cachedSeed = run.seed;
      cachedConfig = run.config;
    }

    const key = `${shiftIndex}|${sequenceIndex}`;
    const cached = plans.get(key);
    if (cached !== undefined) return cached;

    const cards = generateRunSequence(run.seed, run.config, shiftIndex, sequenceIndex);
    const steps = planSequence(cards, run.tools, favorValue);
    plans.set(key, steps);
    return steps;
  };
};

const listUpcomingSequences = (run: RunState, planFutureSequence: SequencePlanner, favorValue: number): UpcomingSequence[] => {
  const { shift, config } = run;
  const upcoming: UpcomingSequence[] = [
    { shiftIndex: shift.index, steps: planSequence(run.sequence.cards, run.tools, favorValue) },
  ];

  for (let shiftIndex = shift.index; shiftIndex < config.quotaCurve.length; shiftIndex++) {
    const firstSequenceIndex = shiftIndex === shift.index ? shift.sequenceIndex + 1 : 0;
    for (let sequenceIndex = firstSequenceIndex; sequenceIndex < config.sequencesPerShift; sequenceIndex++) {
      upcoming.push({ shiftIndex, steps: planFutureSequence(run, shiftIndex, sequenceIndex) });
    }
  }
  return upcoming;
};

/**
 * Finds how far to follow each sequence's plan so that total gain over the
 * rest of the run is highest, given the energy rules. It maximises gain, not
 * quotas met, which is close enough for an upper bound on what foresight buys.
 */
const scheduleRun = (run: RunState, upcoming: UpcomingSequence[]): Schedule => {
  const { capacity, perSequence, shiftBonus } = run.config.energy;
  const scheduleCache = new Map<string, Schedule>();

  const scheduleFrom = (position: number, energy: number, uses: ToolUses): Schedule => {
    if (position >= upcoming.length) return EMPTY_SCHEDULE;

    const key = `${position}|${energy}|${uses.join(',')}`;
    const cached = scheduleCache.get(key);
    if (cached !== undefined) return cached;

    const pricedSteps = priceSteps(run, upcoming[position].steps, uses);
    const startsNewShift = upcoming[position + 1]?.shiftIndex !== upcoming[position].shiftIndex;
    let best = EMPTY_SCHEDULE;
    let gain = 0;

    for (let stepCount = 0; stepCount <= pricedSteps.length; stepCount++) {
      const lastStep = stepCount === 0 ? null : pricedSteps[stepCount - 1];
      const energySpent = lastStep?.cumulativeCost ?? 0;
      if (energySpent > energy) break;
      gain += lastStep?.gain ?? 0;

      const rest = scheduleFrom(
        position + 1,
        Math.min(capacity, energy - energySpent + (startsNewShift ? shiftBonus : perSequence)),
        startsNewShift ? uses.map(() => 0) : countUsesAfter(run, uses, pricedSteps.slice(0, stepCount))
      );
      // Strictly greater, so ties go to the schedule that spends less now.
      if (stepCount === 0 || gain + rest.totalGain > best.totalGain) {
        best = { totalGain: gain + rest.totalGain, stepCount };
      }
    }

    scheduleCache.set(key, best);
    return best;
  };

  return scheduleFrom(0, run.energy, readToolUses(run));
};

/**
 * Plays with perfect foresight of every sequence left in the run. It uses the
 * same per-sequence planner as the other bots, so the gap between it and them
 * measures only the value of knowing what is coming.
 */
export const createOracleBot = (favorValue: number): Bot => {
  const planFutureSequence = createSequencePlanner(favorValue);

  return {
    name: `oracle${describeFavorValue(favorValue)}`,
    playSequence: run => {
      const upcoming = listUpcomingSequences(run, planFutureSequence, favorValue);
      return applySteps(run, upcoming[0].steps.slice(0, scheduleRun(run, upcoming).stepCount));
    },
  };
};
