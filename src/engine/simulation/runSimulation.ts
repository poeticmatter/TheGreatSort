import { createRun, submitSequence } from '../run/runTransitions.ts';
import { RunConfig, RunState, ShiftResult } from '../run/runTypes.ts';
import { Bot } from './bots.ts';

export interface ShiftLengthSummary {
  sequenceCount: number;
  shiftsPlayed: number;
  quotaMetRate: number;
  meanBankedYield: number;
}

export interface SimulationSummary {
  botName: string;
  runCount: number;
  winRate: number;
  meanStrikes: number;
  meanYieldPerSequence: number;
  /** Share of runs that reached each shift and met its quota, by shift index. */
  quotaMetRateByShift: number[];
  byShiftLength: ShiftLengthSummary[];
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

const summarizeByShiftLength = (shifts: ShiftResult[]): ShiftLengthSummary[] => {
  const sequenceCounts = Array.from(new Set(shifts.map(shift => shift.sequenceCount))).sort((a, b) => a - b);

  return sequenceCounts.map(sequenceCount => {
    const matching = shifts.filter(shift => shift.sequenceCount === sequenceCount);
    return {
      sequenceCount,
      shiftsPlayed: matching.length,
      quotaMetRate: rate(matching.filter(shift => shift.wasQuotaMet).length, matching.length),
      meanBankedYield: mean(matching.map(shift => shift.bankedYield)),
    };
  });
};

export const summarizeRuns = (botName: string, runs: RunState[], shiftCount: number): SimulationSummary => {
  const shifts = runs.flatMap(run => run.completedShifts);
  const sequencesPlayed = shifts.reduce((total, shift) => total + shift.sequenceCount, 0);
  const totalYield = shifts.reduce((total, shift) => total + shift.bankedYield, 0);

  const quotaMetRateByShift = Array.from({ length: shiftCount }, (_, shiftIndex) => {
    const reached = shifts.filter(shift => shift.shiftIndex === shiftIndex);
    return rate(reached.filter(shift => shift.wasQuotaMet).length, reached.length);
  });

  return {
    botName,
    runCount: runs.length,
    winRate: rate(runs.filter(run => run.status === 'WON').length, runs.length),
    meanStrikes: mean(runs.map(run => run.strikes)),
    meanYieldPerSequence: rate(totalYield, sequencesPlayed),
    quotaMetRateByShift,
    byShiftLength: summarizeByShiftLength(shifts),
  };
};

/** Plays the same seeds with one bot, so bots can be compared like for like. */
export const simulateRuns = (bot: Bot, seeds: number[], config: RunConfig): SimulationSummary =>
  summarizeRuns(bot.name, seeds.map(seed => simulateRun(bot, seed, config)), config.quotaCurve.length);
