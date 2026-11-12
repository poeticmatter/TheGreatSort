import { describe, expect, it } from 'vitest';

import { RunConfig } from '../run/runTypes.ts';
import { Bot, createGreedyBot, createOracleBot, createPatientBot, idleBot } from './bots.ts';
import { playRun, simulateRun, simulateRuns } from './runSimulation.ts';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const UNREACHABLE_QUOTA = 100000;
const FAVOR_VALUE = 50;

const greedyBot = createGreedyBot(0);
const ALL_BOTS: Bot[] = [
  idleBot,
  greedyBot,
  createGreedyBot(FAVOR_VALUE),
  createPatientBot({ minGainPerEnergy: 5, favorValue: 0 }),
  createOracleBot(0),
];

const buildConfig = (quotaCurve: number[], overrides: Partial<RunConfig> = {}): RunConfig => ({
  quotaCurve,
  sequencesPerShift: 3,
  sequenceLength: 6,
  strikeLimit: 2,
  loadout: [
    { type: 'swap', cost: 1 },
    { type: 'promote', cost: 2 },
    { type: 'hop', cost: 3 },
  ],
  energy: { capacity: 12, startingEnergy: 6, perSequence: 2, shiftBonus: 4 },
  starsPerSequence: 1,
  starPoolSize: 3,
  ...overrides,
});

const MODERATE_CONFIG = buildConfig([40, 40, 40]);
const EASY_CONFIG = buildConfig([0, 0, 0]);
const IMPOSSIBLE_CONFIG = buildConfig([UNREACHABLE_QUOTA, UNREACHABLE_QUOTA, UNREACHABLE_QUOTA]);

describe('simulateRun', () => {
  it.each(ALL_BOTS)('terminates with a final status for the $name bot', bot => {
    expect(['WON', 'LOST']).toContain(simulateRun(bot, SEEDS[0], MODERATE_CONFIG).status);
  });

  it.each(ALL_BOTS)('wins with zero strikes when every quota is zero for the $name bot', bot => {
    const run = simulateRun(bot, SEEDS[0], EASY_CONFIG);

    expect([run.status, run.strikes]).toEqual(['WON', 0]);
  });

  it.each(ALL_BOTS)('loses at the strike limit when quotas are unreachable for the $name bot', bot => {
    const run = simulateRun(bot, SEEDS[0], IMPOSSIBLE_CONFIG);

    expect([run.status, run.strikes]).toEqual(['LOST', IMPOSSIBLE_CONFIG.strikeLimit]);
  });

  it('plays the same seed to the same result twice', () => {
    expect(simulateRun(greedyBot, SEEDS[0], MODERATE_CONFIG)).toEqual(
      simulateRun(greedyBot, SEEDS[0], MODERATE_CONFIG)
    );
  });
});

describe('simulateRuns', () => {
  it('summarizes one run per seed', () => {
    expect(simulateRuns(idleBot, SEEDS, MODERATE_CONFIG).runCount).toBe(SEEDS.length);
  });

  it('reports the bot name', () => {
    expect(simulateRuns(greedyBot, SEEDS, MODERATE_CONFIG).botName).toBe(greedyBot.name);
  });

  it('is deterministic for the same seeds', () => {
    expect(simulateRuns(greedyBot, SEEDS, MODERATE_CONFIG)).toEqual(simulateRuns(greedyBot, SEEDS, MODERATE_CONFIG));
  });

  it('reports a full win rate when every quota is zero', () => {
    expect(simulateRuns(idleBot, SEEDS, EASY_CONFIG).winRate).toBe(1);
  });

  it('reports a zero win rate when quotas are unreachable', () => {
    expect(simulateRuns(greedyBot, SEEDS, IMPOSSIBLE_CONFIG).winRate).toBe(0);
  });

  it('reports mean strikes equal to the strike limit when quotas are unreachable', () => {
    expect(simulateRuns(greedyBot, SEEDS, IMPOSSIBLE_CONFIG).meanStrikes).toBe(IMPOSSIBLE_CONFIG.strikeLimit);
  });

  it('gives the greedy bot at least the idle bot yield per sequence on the same seeds', () => {
    const greedy = simulateRuns(greedyBot, SEEDS, EASY_CONFIG).meanYieldPerSequence;
    const idle = simulateRuns(idleBot, SEEDS, EASY_CONFIG).meanYieldPerSequence;

    expect(greedy).toBeGreaterThanOrEqual(idle);
  });

  it('gives a bot that values favors at least the favor rate of one that ignores them', () => {
    const valuing = simulateRuns(createGreedyBot(FAVOR_VALUE), SEEDS, EASY_CONFIG).favorRate;
    const ignoring = simulateRuns(createGreedyBot(0), SEEDS, EASY_CONFIG).favorRate;

    expect(valuing).toBeGreaterThanOrEqual(ignoring);
  });

  it('reports a favor rate of zero when no cards are starred', () => {
    const config = buildConfig([0, 0, 0], { starsPerSequence: 0 });

    expect(simulateRuns(createGreedyBot(FAVOR_VALUE), SEEDS, config).favorRate).toBe(0);
  });

  it('keeps the favor rate between zero and one', () => {
    const { favorRate } = simulateRuns(greedyBot, SEEDS, EASY_CONFIG);

    expect(favorRate >= 0 && favorRate <= 1).toBe(true);
  });

  it('reports a below-target rate of zero when every quota is zero', () => {
    expect(simulateRuns(idleBot, SEEDS, EASY_CONFIG).belowTargetRate).toBe(0);
  });

  it('reports a below-target rate of one when quotas are unreachable', () => {
    expect(simulateRuns(idleBot, SEEDS, IMPOSSIBLE_CONFIG).belowTargetRate).toBe(1);
  });
});

describe('playRun', () => {
  it('records one tool-use entry per sequence played', () => {
    const { run, toolUsesBySequence } = playRun(greedyBot, SEEDS[0], EASY_CONFIG);

    expect(toolUsesBySequence).toHaveLength(run.config.quotaCurve.length * run.config.sequencesPerShift);
  });

  it('records zero tool uses for every sequence the idle bot plays', () => {
    const { toolUsesBySequence } = playRun(idleBot, SEEDS[0], EASY_CONFIG);

    expect(toolUsesBySequence.every(uses => uses === 0)).toBe(true);
  });

  it('ends in the same state as simulateRun', () => {
    expect(playRun(greedyBot, SEEDS[0], MODERATE_CONFIG).run).toEqual(simulateRun(greedyBot, SEEDS[0], MODERATE_CONFIG));
  });
});

describe('tool use statistics', () => {
  it('reports a mean of zero tool uses per sequence for the idle bot', () => {
    expect(simulateRuns(idleBot, SEEDS, EASY_CONFIG).meanToolUsesPerSequence).toBe(0);
  });

  it('reports every idle sequence as having zero tool uses', () => {
    expect(simulateRuns(idleBot, SEEDS, EASY_CONFIG).toolUseShares).toEqual([1]);
  });

  it.each(ALL_BOTS)('makes the tool use shares sum to one for the $name bot', bot => {
    const { toolUseShares } = simulateRuns(bot, SEEDS, MODERATE_CONFIG);

    expect(toolUseShares.reduce((total, share) => total + share, 0)).toBeCloseTo(1);
  });
});
