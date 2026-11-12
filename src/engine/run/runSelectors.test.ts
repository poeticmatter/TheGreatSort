import { describe, expect, it } from 'vitest';

import { TOOL_REGISTRY } from '../tools/index.ts';
import { AgentRole, CardItem } from '../types.ts';
import {
  canAffordTool,
  findRunTool,
  getSequenceOutcome,
  getSequenceTarget,
  getShiftCount,
} from './runSelectors.ts';
import { applyRunMove, createRun, submitSequence } from './runTransitions.ts';
import { EnergyConfig, RunConfig, RunState } from './runTypes.ts';

const SEED = 99;
const SWAP_COST = 3;
const PROMOTE_COST = 2;
const SWAP_POSITION = 0;
const PROMOTE_POSITION = 1;

const buildConfig = (overrides: Partial<RunConfig> = {}, energy: Partial<EnergyConfig> = {}): RunConfig => ({
  quotaCurve: [0, 0, 0],
  sequencesPerShift: 4,
  sequenceLength: 8,
  strikeLimit: 2,
  loadout: [
    { type: 'swap', cost: SWAP_COST },
    { type: 'promote', cost: PROMOTE_COST },
  ],
  energy: { capacity: 20, startingEnergy: 10, perSequence: 2, shiftBonus: 4, ...energy },
  starsPerSequence: 1,
  starPoolSize: 3,
  ...overrides,
});

const toCards = (values: number[], starredIndices: number[] = []): CardItem[] =>
  values.map((val, index) => ({
    id: `card-${index}`,
    val,
    status: 'pending',
    role: AgentRole.NONE,
    hasShield: false,
    isStarred: starredIndices.includes(index),
  }));

const withCards = (run: RunState, cards: CardItem[]): RunState => ({
  ...run,
  sequence: { cards, moves: [] },
});

const useTool = (run: RunState, position: number): RunState => {
  const tool = run.tools[position];
  const [move] = TOOL_REGISTRY[tool.type].generateMoves(run.sequence.cards);
  return applyRunMove(run, tool.id, move.index, move.targetIndex);
};

describe('findRunTool', () => {
  it('finds a tool by id', () => {
    const run = createRun(SEED, buildConfig());

    expect(findRunTool(run, run.tools[1].id)).toBe(run.tools[1]);
  });

  it('returns undefined for an unknown id', () => {
    expect(findRunTool(createRun(SEED, buildConfig()), 'missing-tool')).toBeUndefined();
  });
});

describe('canAffordTool', () => {
  it('is true when the pool covers the tool cost', () => {
    const run = createRun(SEED, buildConfig());

    expect(canAffordTool(run, run.tools[SWAP_POSITION].id)).toBe(true);
  });

  it('is true when the pool equals the tool cost exactly', () => {
    const run = createRun(SEED, buildConfig({}, { startingEnergy: SWAP_COST }));

    expect(canAffordTool(run, run.tools[SWAP_POSITION].id)).toBe(true);
  });

  it('is false when the pool is one short of the tool cost', () => {
    const run = createRun(SEED, buildConfig({}, { startingEnergy: SWAP_COST - 1 }));

    expect(canAffordTool(run, run.tools[SWAP_POSITION].id)).toBe(false);
  });

  it('is false once earlier uses have raised the cost beyond the pool', () => {
    const run = useTool(createRun(SEED, buildConfig({}, { startingEnergy: SWAP_COST })), SWAP_POSITION);

    expect(canAffordTool(run, run.tools[SWAP_POSITION].id)).toBe(false);
  });

  it('is false for an unknown tool id', () => {
    expect(canAffordTool(createRun(SEED, buildConfig()), 'missing-tool')).toBe(false);
  });
});

describe('getShiftCount', () => {
  it('equals the length of the quota curve', () => {
    expect(getShiftCount(createRun(SEED, buildConfig()))).toBe(3);
  });
});

describe('getSequenceTarget', () => {
  it('is the quota divided evenly across the shift sequences', () => {
    const run = createRun(SEED, buildConfig({ quotaCurve: [100], sequencesPerShift: 4 }));

    expect(getSequenceTarget(run)).toBe(25);
  });

  it('rounds up when the quota does not divide evenly', () => {
    const run = createRun(SEED, buildConfig({ quotaCurve: [100], sequencesPerShift: 3 }));

    expect(getSequenceTarget(run)).toBe(34);
  });

  it('includes a deficit carried into the shift', () => {
    const config = buildConfig({ quotaCurve: [1000, 40], sequencesPerShift: 1, strikeLimit: 3 });
    const run = submitSequence(createRun(SEED, config));

    expect(getSequenceTarget(run)).toBe(run.shift.quota);
  });
});

describe('getSequenceOutcome', () => {
  const buildRun = (cards: CardItem[]): RunState =>
    withCards(createRun(SEED, buildConfig({ quotaCurve: [100], sequencesPerShift: 4 })), cards);

  it('reports the yield of the current cards', () => {
    expect(getSequenceOutcome(buildRun(toCards([1, 2, 3]))).yield).toBe(6);
  });

  it('reports the sequence target', () => {
    expect(getSequenceOutcome(buildRun(toCards([1, 2, 3]))).target).toBe(25);
  });

  it('flags a yield below the target', () => {
    expect(getSequenceOutcome(buildRun(toCards([1, 2, 3]))).isBelowTarget).toBe(true);
  });

  it('does not flag a yield equal to the target', () => {
    expect(getSequenceOutcome(buildRun(toCards([25]))).isBelowTarget).toBe(false);
  });

  it('counts favors from surviving starred cards only', () => {
    expect(getSequenceOutcome(buildRun(toCards([1, 3, 2, 4], [0, 2]))).favorsEarned).toBe(1);
  });

  it('does not change the run', () => {
    const run = buildRun(toCards([1, 2, 3], [0]));

    getSequenceOutcome(run);

    expect([run.favors, run.shift.bankedYield, run.shift.sequencesBelowTarget]).toEqual([0, 0, 0]);
  });
});
