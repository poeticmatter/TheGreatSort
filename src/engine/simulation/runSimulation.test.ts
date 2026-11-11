import { describe, expect, it } from 'vitest';

import { RunConfig } from '../run/runTypes.ts';
import { Bot, createPatientBot, greedyBot, idleBot, oracleBot } from './bots.ts';
import { simulateRun, simulateRuns } from './runSimulation.ts';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const UNREACHABLE_QUOTA = 100000;

const ALL_BOTS: Bot[] = [idleBot, greedyBot, createPatientBot(5), oracleBot];

const buildConfig = (quotaCurve: number[]): RunConfig => ({
  quotaCurve,
  minSequencesPerShift: 3,
  maxSequencesPerShift: 4,
  sequenceLength: 6,
  strikeLimit: 2,
  loadout: [
    { type: 'swap', cooldown: 2 },
    { type: 'promote', cooldown: 1 },
    { type: 'hop', cooldown: 3 },
  ],
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
    expect(simulateRuns(greedyBot, SEEDS, MODERATE_CONFIG).botName).toBe('greedy');
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
});
