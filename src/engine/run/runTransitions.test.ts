import { describe, expect, it } from 'vitest';

import { calculateBatchScore } from '../grading.ts';
import { TOOL_REGISTRY } from '../tools/index.ts';
import { generateRunSequence } from './runGeneration.ts';
import { applyRunMove, canApplyRunMove, createRun, submitSequence, undoRunMove } from './runTransitions.ts';
import { RunConfig, RunState } from './runTypes.ts';

const SEED = 4242;

const buildConfig = (overrides: Partial<RunConfig> = {}): RunConfig => ({
  quotaCurve: [0, 0],
  sequencesPerShift: 3,
  sequenceLength: 8,
  strikeLimit: 2,
  loadout: [
    { type: 'swap', cost: 1 },
    { type: 'promote', cost: 1 },
  ],
  energy: { capacity: 20, startingEnergy: 10, perSequence: 2, shiftBonus: 4 },
  starsPerSequence: 1,
  starPoolSize: 3,
  ...overrides,
});

const getToolId = (run: RunState, position: number): string => run.tools[position].id;

const useTool = (run: RunState, position: number): RunState => {
  const tool = run.tools[position];
  const [move] = TOOL_REGISTRY[tool.type].generateMoves(run.sequence.cards);
  return applyRunMove(run, tool.id, move.index, move.targetIndex);
};

const submitTimes = (run: RunState, count: number): RunState =>
  Array.from({ length: count }).reduce<RunState>(current => submitSequence(current), run);

const toValues = (run: RunState): number[] => run.sequence.cards.map(card => card.val);

describe('createRun', () => {
  it('starts in progress with no strikes and no favors', () => {
    const run = createRun(SEED, buildConfig());

    expect([run.status, run.strikes, run.favors]).toEqual(['IN_PROGRESS', 0, 0]);
  });

  it('produces identical runs for the same seed and config', () => {
    expect(createRun(SEED, buildConfig())).toEqual(createRun(SEED, buildConfig()));
  });

  it('starts the first shift with the first quota in the curve', () => {
    expect(createRun(SEED, buildConfig({ quotaCurve: [77, 88] })).shift.quota).toBe(77);
  });

  it('generates sequences of the configured length', () => {
    expect(createRun(SEED, buildConfig({ sequenceLength: 6 })).sequence.cards).toHaveLength(6);
  });

  it('throws for an empty quota curve', () => {
    expect(() => createRun(SEED, buildConfig({ quotaCurve: [] }))).toThrow();
  });

  it('throws when sequences per shift is below one', () => {
    expect(() => createRun(SEED, buildConfig({ sequencesPerShift: 0 }))).toThrow();
  });

  it('throws when the strike limit is below one', () => {
    expect(() => createRun(SEED, buildConfig({ strikeLimit: 0 }))).toThrow();
  });

  it('throws when stars per sequence is negative', () => {
    expect(() => createRun(SEED, buildConfig({ starsPerSequence: -1 }))).toThrow();
  });

  it('throws when stars per sequence exceeds the star pool size', () => {
    expect(() => createRun(SEED, buildConfig({ starsPerSequence: 4, starPoolSize: 3 }))).toThrow();
  });
});

describe('run sequence generation', () => {
  const countStars = (cards: { isStarred?: boolean }[]): number => cards.filter(card => card.isStarred).length;

  it('generates the same sequence for the same seed and position', () => {
    const config = buildConfig();

    expect(generateRunSequence(SEED, config, 1, 2)).toEqual(generateRunSequence(SEED, config, 1, 2));
  });

  it('generates different sequences for different sequence positions', () => {
    const config = buildConfig();
    const first = generateRunSequence(SEED, config, 0, 0).map(card => card.val);
    const second = generateRunSequence(SEED, config, 0, 1).map(card => card.val);

    expect(second).not.toEqual(first);
  });

  it('generates different sequences for different shift positions', () => {
    const config = buildConfig();
    const firstShift = generateRunSequence(SEED, config, 0, 0).map(card => card.val);
    const secondShift = generateRunSequence(SEED, config, 1, 0).map(card => card.val);

    expect(secondShift).not.toEqual(firstShift);
  });

  it('stars exactly the configured number of cards', () => {
    const config = buildConfig({ starsPerSequence: 2, starPoolSize: 4 });

    expect(countStars(generateRunSequence(SEED, config, 0, 0))).toBe(2);
  });

  it('stars no card when stars per sequence is zero', () => {
    const config = buildConfig({ starsPerSequence: 0 });

    expect(countStars(generateRunSequence(SEED, config, 0, 0))).toBe(0);
  });

  it('draws every star from the lowest values of the sequence', () => {
    const config = buildConfig({ starsPerSequence: 2, starPoolSize: 3 });
    const positions = [0, 1, 2, 3, 4, 5];
    const allDrawnFromPool = positions.every(sequenceIndex => {
      const cards = generateRunSequence(SEED, config, 0, sequenceIndex);
      const poolCeiling = cards.map(card => card.val).sort((a, b) => a - b)[config.starPoolSize - 1];
      return cards.filter(card => card.isStarred).every(card => card.val <= poolCeiling);
    });

    expect(allDrawnFromPool).toBe(true);
  });
});

describe('submitSequence', () => {
  it('banks the yield of the current cards', () => {
    const run = createRun(SEED, buildConfig());

    expect(submitSequence(run).shift.bankedYield).toBe(calculateBatchScore(run.sequence.cards));
  });

  it('accumulates yield across sequences', () => {
    const run = createRun(SEED, buildConfig());
    const secondSequence = generateRunSequence(SEED, run.config, 0, 1);
    const expectedYield = calculateBatchScore(run.sequence.cards) + calculateBatchScore(secondSequence);

    expect(submitTimes(run, 2).shift.bankedYield).toBe(expectedYield);
  });

  it('banks the yield of the cards after tools were applied', () => {
    const run = useTool(createRun(SEED, buildConfig()), 1);

    expect(submitSequence(run).shift.bankedYield).toBe(calculateBatchScore(run.sequence.cards));
  });

  it('loads the next sequence of the shift', () => {
    const run = submitSequence(createRun(SEED, buildConfig()));

    expect(run.sequence.cards).toEqual(generateRunSequence(SEED, run.config, 0, 1));
  });

  it('starts the next sequence with no moves', () => {
    expect(submitSequence(useTool(createRun(SEED, buildConfig()), 1)).sequence.moves).toEqual([]);
  });

  it('keeps the shift open until sequences per shift have been submitted', () => {
    expect(submitTimes(createRun(SEED, buildConfig()), 2).shift.index).toBe(0);
  });

  it('starts the next shift once sequences per shift have been submitted', () => {
    expect(submitTimes(createRun(SEED, buildConfig()), 3).shift.index).toBe(1);
  });
});

describe('applyRunMove', () => {
  it('changes the cards when a legal move is applied', () => {
    const run = createRun(SEED, buildConfig());

    expect(toValues(useTool(run, 0))).not.toEqual(toValues(run));
  });

  it('records the move on the sequence', () => {
    expect(useTool(createRun(SEED, buildConfig()), 0).sequence.moves).toHaveLength(1);
  });

  it('does not mutate the run it was applied to', () => {
    const run = createRun(SEED, buildConfig());
    const valuesBefore = toValues(run);

    useTool(run, 0);

    expect(toValues(run)).toEqual(valuesBefore);
  });

  it('throws for an unknown tool id', () => {
    expect(() => applyRunMove(createRun(SEED, buildConfig()), 'missing-tool', 0, 1)).toThrow();
  });

  it('throws for an invalid index', () => {
    const run = createRun(SEED, buildConfig());

    expect(() => applyRunMove(run, getToolId(run, 1), 999)).toThrow();
  });
});

describe('canApplyRunMove', () => {
  it('is true for a legal move with an affordable tool', () => {
    const run = createRun(SEED, buildConfig());
    const [move] = TOOL_REGISTRY.swap.generateMoves(run.sequence.cards);

    expect(canApplyRunMove(run, getToolId(run, 0), move.index, move.targetIndex)).toBe(true);
  });

  it('is false for an unknown tool id', () => {
    expect(canApplyRunMove(createRun(SEED, buildConfig()), 'missing-tool', 0, 1)).toBe(false);
  });

  it('is false for an invalid index', () => {
    const run = createRun(SEED, buildConfig());

    expect(canApplyRunMove(run, getToolId(run, 1), 999)).toBe(false);
  });
});

describe('undoRunMove', () => {
  it('restores the cards from before the last move', () => {
    const run = createRun(SEED, buildConfig());

    expect(toValues(undoRunMove(useTool(run, 0)))).toEqual(toValues(run));
  });

  it('only takes back the latest of several moves', () => {
    const afterFirstMove = useTool(createRun(SEED, buildConfig()), 0);

    expect(toValues(undoRunMove(useTool(afterFirstMove, 1)))).toEqual(toValues(afterFirstMove));
  });

  it('returns the run unchanged when there are no moves', () => {
    const run = createRun(SEED, buildConfig());

    expect(undoRunMove(run)).toBe(run);
  });
});
