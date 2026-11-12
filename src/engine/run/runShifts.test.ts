import { describe, expect, it } from 'vitest';

import { calculateBatchScore } from '../grading.ts';
import { TOOL_REGISTRY } from '../tools/index.ts';
import { AgentRole, CardItem } from '../types.ts';
import { applyRunMove, canApplyRunMove, createRun, submitSequence, undoRunMove } from './runTransitions.ts';
import { RunConfig, RunState } from './runTypes.ts';

const SEED = 4242;
const UNREACHABLE_QUOTA = 100000;

const buildConfig = (overrides: Partial<RunConfig> = {}): RunConfig => ({
  quotaCurve: [0, 0],
  sequencesPerShift: 1,
  sequenceLength: 8,
  strikeLimit: 2,
  loadout: [{ type: 'swap', baseCost: 1 }],
  energy: { capacity: 20, startingEnergy: 10, perSequence: 2, shiftBonus: 4, repeatUseSurcharge: 1 },
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

const submitTimes = (run: RunState, count: number): RunState =>
  Array.from({ length: count }).reduce<RunState>(current => submitSequence(current), run);

const useFirstTool = (run: RunState): RunState => {
  const [tool] = run.tools;
  const [move] = TOOL_REGISTRY[tool.type].generateMoves(run.sequence.cards);
  return applyRunMove(run, tool.id, move.index, move.targetIndex);
};

describe('closing a shift', () => {
  it('records the quota as met when banked yield exceeds the quota', () => {
    const run = submitSequence(createRun(SEED, buildConfig({ quotaCurve: [0, 0] })));

    expect(run.completedShifts[0].wasQuotaMet).toBe(true);
  });

  it('adds no strike when the quota is met', () => {
    expect(submitSequence(createRun(SEED, buildConfig({ quotaCurve: [0, 0] }))).strikes).toBe(0);
  });

  it('counts banked yield exactly equal to the quota as met', () => {
    const exactQuota = calculateBatchScore(createRun(SEED, buildConfig()).sequence.cards);
    const run = submitSequence(createRun(SEED, buildConfig({ quotaCurve: [exactQuota, 0] })));

    expect(run.completedShifts[0].wasQuotaMet).toBe(true);
  });

  it('adds a strike when the quota is missed', () => {
    const config = buildConfig({ quotaCurve: [UNREACHABLE_QUOTA, 0], strikeLimit: 3 });

    expect(submitSequence(createRun(SEED, config)).strikes).toBe(1);
  });

  it('carries the shortfall into the next shift quota', () => {
    const config = buildConfig({ quotaCurve: [UNREACHABLE_QUOTA, 50], strikeLimit: 3 });
    const initial = createRun(SEED, config);
    const shortfall = UNREACHABLE_QUOTA - calculateBatchScore(initial.sequence.cards);

    expect(submitSequence(initial).shift.quota).toBe(50 + shortfall);
  });

  it('does not carry surplus into the next shift quota', () => {
    const config = buildConfig({ quotaCurve: [0, 50] });

    expect(submitSequence(createRun(SEED, config)).shift.quota).toBe(50);
  });

  it('starts the next shift at the first sequence with a clean tally', () => {
    const { shift } = submitSequence(createRun(SEED, buildConfig()));

    expect([shift.index, shift.sequenceIndex, shift.bankedYield, shift.favorsEarned, shift.sequencesBelowTarget]).toEqual([
      1, 0, 0, 0, 0,
    ]);
  });

  it('records the finished shift result', () => {
    expect(submitSequence(createRun(SEED, buildConfig())).completedShifts).toHaveLength(1);
  });
});

describe('run outcome', () => {
  const buildFinishedRun = (): RunState => submitSequence(createRun(SEED, buildConfig({ quotaCurve: [0] })));

  it('loses when the strike limit is reached', () => {
    const config = buildConfig({ quotaCurve: [UNREACHABLE_QUOTA, UNREACHABLE_QUOTA, 0], strikeLimit: 2 });

    expect(submitTimes(createRun(SEED, config), 2).status).toBe('LOST');
  });

  it('stays in progress one strike below the limit', () => {
    const config = buildConfig({ quotaCurve: [UNREACHABLE_QUOTA, 0, 0], strikeLimit: 2 });

    expect(submitSequence(createRun(SEED, config)).status).toBe('IN_PROGRESS');
  });

  it('wins when the last shift is completed without reaching the strike limit', () => {
    expect(submitTimes(createRun(SEED, buildConfig({ quotaCurve: [0, 0] })), 2).status).toBe('WON');
  });

  it('loses on the final shift when the last strike reaches the limit', () => {
    const config = buildConfig({ quotaCurve: [0, UNREACHABLE_QUOTA], strikeLimit: 1 });

    expect(submitTimes(createRun(SEED, config), 2).status).toBe('LOST');
  });

  it('ignores submitSequence once the run is over', () => {
    const finished = buildFinishedRun();

    expect(submitSequence(finished)).toBe(finished);
  });

  it('ignores undoRunMove once the run is over', () => {
    const finished = buildFinishedRun();

    expect(undoRunMove(finished)).toBe(finished);
  });

  it('rejects every move once the run is over', () => {
    const finished = buildFinishedRun();
    const [move] = TOOL_REGISTRY.swap.generateMoves(finished.sequence.cards);

    expect(canApplyRunMove(finished, finished.tools[0].id, move.index, move.targetIndex)).toBe(false);
  });
});

describe('favors', () => {
  const buildRun = (cards: CardItem[]): RunState =>
    withCards(createRun(SEED, buildConfig({ quotaCurve: [0, 0], sequencesPerShift: 2 })), cards);

  it('adds a favor to the run for a starred card that survives', () => {
    expect(submitSequence(buildRun(toCards([1, 2, 3], [1]))).favors).toBe(1);
  });

  it('adds a favor to the shift for a starred card that survives', () => {
    expect(submitSequence(buildRun(toCards([1, 2, 3], [1]))).shift.favorsEarned).toBe(1);
  });

  it('adds nothing for a starred card that is eliminated', () => {
    expect(submitSequence(buildRun(toCards([1, 3, 2, 4], [2]))).favors).toBe(0);
  });

  it('counts the first card as surviving when it is starred', () => {
    expect(submitSequence(buildRun(toCards([4, 5, 6], [0]))).favors).toBe(1);
  });

  it('counts every surviving starred card', () => {
    expect(submitSequence(buildRun(toCards([1, 2, 3, 4], [0, 1, 3]))).favors).toBe(3);
  });

  it('adds nothing for unstarred cards', () => {
    expect(submitSequence(buildRun(toCards([1, 2, 3]))).favors).toBe(0);
  });

  it('accumulates favors across the sequences of a shift', () => {
    const afterFirst = submitSequence(buildRun(toCards([1, 2], [0])));

    expect(submitSequence(withCards(afterFirst, toCards([1, 2], [1]))).favors).toBe(2);
  });

  it('records the shift total on the shift result', () => {
    const afterFirst = submitSequence(buildRun(toCards([1, 2], [0])));
    const closed = submitSequence(withCards(afterFirst, toCards([1, 2], [1])));

    expect(closed.completedShifts[0].favorsEarned).toBe(2);
  });

  it('keeps the run total when the next shift resets the shift tally', () => {
    const afterFirst = submitSequence(buildRun(toCards([1, 2], [0])));
    const nextShift = submitSequence(withCards(afterFirst, toCards([1, 2], [1])));

    expect([nextShift.favors, nextShift.shift.favorsEarned]).toEqual([2, 0]);
  });

  it('does not change strikes or quota', () => {
    const withStar = submitSequence(buildRun(toCards([1, 2, 3], [1])));
    const withoutStar = submitSequence(buildRun(toCards([1, 2, 3])));

    expect([withStar.strikes, withStar.shift.quota]).toEqual([withoutStar.strikes, withoutStar.shift.quota]);
  });
});

describe('sequences below target', () => {
  const QUOTA = 100;
  const SEQUENCES = 3;
  const buildRun = (cards: CardItem[]): RunState =>
    withCards(createRun(SEED, buildConfig({ quotaCurve: [QUOTA, 0], sequencesPerShift: SEQUENCES, strikeLimit: 5 })), cards);

  it('counts a sequence whose yield is below the target', () => {
    expect(submitSequence(buildRun(toCards([1, 2]))).shift.sequencesBelowTarget).toBe(1);
  });

  it('does not count a sequence whose yield reaches the target', () => {
    expect(submitSequence(buildRun(toCards([50, 60]))).shift.sequencesBelowTarget).toBe(0);
  });

  it('does not count a sequence whose yield equals the target exactly', () => {
    const target = Math.ceil(QUOTA / SEQUENCES);

    expect(submitSequence(buildRun(toCards([target]))).shift.sequencesBelowTarget).toBe(0);
  });

  it('records the shift total on the shift result', () => {
    const closed = submitTimes(buildRun(toCards([1, 2])), 1);
    const secondBelow = submitSequence(withCards(closed, toCards([1, 2])));
    const finished = submitSequence(withCards(secondBelow, toCards([1, 2])));

    expect(finished.completedShifts[0].sequencesBelowTarget).toBe(3);
  });

  it('adds no strike by itself', () => {
    expect(submitSequence(buildRun(toCards([1, 2]))).strikes).toBe(0);
  });

  it('leaves the shift quota unchanged', () => {
    expect(submitSequence(buildRun(toCards([1, 2]))).shift.quota).toBe(QUOTA);
  });
});
