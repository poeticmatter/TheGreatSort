import { createRun, submitSequence } from '../run/runTransitions.ts';
import { RunConfig, RunState } from '../run/runTypes.ts';
import { Bot } from './bots.ts';

export interface SimulationSummary {
  botName: string;
  runCount: number;
  winRate: number;
  meanStrikes: number;
  meanYieldPerSequence: number;
  /** Share of starred cards that survived, across all sequences played. */
  favorRate: number;
  /** Share of sequences submitted below their share of the shift quota. */
  belowTargetRate: number;
  /** Share of runs that reached each shift and met its quota, by shift index. */
  quotaMetRateByShift: number[];
}

export const simulateRun = (bot: Bot, seed: number, config: RunConfig): RunState => {
  let run = createRun(seed, config);
  while (run.status === 'IN_PROGRESS') {
    run = submitSequence(bot.playSequence(run));
  }
  return run;
};

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;

const rate = (matching: number, total: number): number => (total === 0 ? 0 : matching / total);

const sum = <T>(items: T[], pick: (item: T) => number): number =>
  items.reduce((total, item) => total + pick(item), 0);

export const summarizeRuns = (botName: string, runs: RunState[], config: RunConfig): SimulationSummary => {
  const shifts = runs.flatMap(run => run.completedShifts);
  const sequencesPlayed = shifts.length * config.sequencesPerShift;

  const quotaMetRateByShift = config.quotaCurve.map((_, shiftIndex) => {
    const reached = shifts.filter(shift => shift.shiftIndex === shiftIndex);
    return rate(reached.filter(shift => shift.wasQuotaMet).length, reached.length);
  });

  return {
    botName,
    runCount: runs.length,
    winRate: rate(runs.filter(run => run.status === 'WON').length, runs.length),
    meanStrikes: mean(runs.map(run => run.strikes)),
    meanYieldPerSequence: rate(sum(shifts, shift => shift.bankedYield), sequencesPlayed),
    favorRate: rate(sum(shifts, shift => shift.favorsEarned), sequencesPlayed * config.starsPerSequence),
    belowTargetRate: rate(sum(shifts, shift => shift.sequencesBelowTarget), sequencesPlayed),
    quotaMetRateByShift,
  };
};

/** Plays the same seeds with one bot, so bots can be compared like for like. */
export const simulateRuns = (bot: Bot, seeds: number[], config: RunConfig): SimulationSummary =>
  summarizeRuns(bot.name, seeds.map(seed => simulateRun(bot, seed, config)), config);
