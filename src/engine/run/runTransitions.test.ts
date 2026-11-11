import { describe, expect, it } from 'vitest';

import { calculateBatchScore } from '../grading.ts';
import { TOOL_REGISTRY } from '../tools/index.ts';
import { generateRunSequence, generateShiftSequenceCount } from './runGeneration.ts';
import { findRunTool, getReadyTools, isToolReady } from './runSelectors.ts';
import { applyRunMove, canApplyRunMove, createRun, submitSequence, undoRunMove } from './runTransitions.ts';
import { RunConfig, RunState } from './runTypes.ts';

const SEED = 4242;
const UNREACHABLE_QUOTA = 100000;
const SINGLE_SEQUENCE_SHIFTS = { minSequencesPerShift: 1, maxSequencesPerShift: 1 };

const buildConfig = (overrides: Partial<RunConfig> = {}): RunConfig => ({
  quotaCurve: [0, 0],
  minSequencesPerShift: 3,
  maxSequencesPerShift: 3,
  sequenceLength: 8,
  strikeLimit: 2,
  loadout: [
    { type: 'swap', cooldown: 2 },
    { type: 'promote', cooldown: 0 },
  ],
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
  it('starts in progress with no strikes', () => {
    const run = createRun(SEED, buildConfig());

    expect([run.status, run.strikes]).toEqual(['IN_PROGRESS', 0]);
  });

  it('starts with every loadout tool ready', () => {
    expect(getReadyTools(createRun(SEED, buildConfig()))).toHaveLength(2);
  });

  it('produces identical runs for the same seed and config', () => {
    expect(createRun(SEED, buildConfig())).toEqual(createRun(SEED, buildConfig()));
  });

  it('starts the first shift with the first quota in the curve', () => {
    const run = createRun(SEED, buildConfig({ quotaCurve: [77, 88] }));

    expect(run.shift.quota).toBe(77);
  });

  it('generates sequences of the configured length', () => {
    expect(createRun(SEED, buildConfig({ sequenceLength: 6 })).sequence.cards).toHaveLength(6);
  });

  it('throws for an empty quota curve', () => {
    expect(() => createRun(SEED, buildConfig({ quotaCurve: [] }))).toThrow();
  });

  it('throws when the minimum sequences per shift is below one', () => {
    expect(() => createRun(SEED, buildConfig({ minSequencesPerShift: 0 }))).toThrow();
  });

  it('throws when the maximum sequences per shift is below the minimum', () => {
    expect(() => createRun(SEED, buildConfig({ minSequencesPerShift: 4, maxSequencesPerShift: 3 }))).toThrow();
  });

  it('throws when the strike limit is below one', () => {
    expect(() => createRun(SEED, buildConfig({ strikeLimit: 0 }))).toThrow();
  });
});

describe('run generation', () => {
  it('keeps every shift length within the configured bounds', () => {
    const config = buildConfig({ minSequencesPerShift: 2, maxSequencesPerShift: 5 });
    const lengths = Array.from({ length: 40 }, (_, shiftIndex) => generateShiftSequenceCount(SEED, config, shiftIndex));

    expect(lengths.every(length => length >= 2 && length <= 5)).toBe(true);
  });

  it('produces every length of the inclusive range across many shifts', () => {
    const config = buildConfig({ minSequencesPerShift: 2, maxSequencesPerShift: 4 });
    const lengths = new Set(
      Array.from({ length: 60 }, (_, shiftIndex) => generateShiftSequenceCount(SEED, config, shiftIndex))
    );

    expect(Array.from(lengths).sort()).toEqual([2, 3, 4]);
  });

  it('generates the same shift length for the same seed and shift', () => {
    const config = buildConfig({ minSequencesPerShift: 2, maxSequencesPerShift: 9 });

    expect(generateShiftSequenceCount(SEED, config, 1)).toBe(generateShiftSequenceCount(SEED, config, 1));
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
    const run = submitSequence(useTool(createRun(SEED, buildConfig()), 1));

    expect(run.sequence.moves).toEqual([]);
  });

  it('advances the sequence index', () => {
    expect(submitSequence(createRun(SEED, buildConfig())).shift.sequenceIndex).toBe(1);
  });
});

describe('tool cooldowns', () => {
  it('makes a tool unavailable for the rest of the sequence it was used in', () => {
    const run = useTool(createRun(SEED, buildConfig()), 0);

    expect(isToolReady(run, getToolId(run, 0))).toBe(false);
  });

  it('keeps a used tool unavailable for exactly its cooldown in the following sequences', () => {
    const config = buildConfig({ minSequencesPerShift: 5, maxSequencesPerShift: 5 });
    let run = submitSequence(useTool(createRun(SEED, config), 0));
    const toolId = getToolId(run, 0);
    const readiness: boolean[] = [];

    for (let step = 0; step < 3; step++) {
      readiness.push(isToolReady(run, toolId));
      run = submitSequence(run);
    }

    expect(readiness).toEqual([false, false, true]);
  });

  it('makes a tool with zero cooldown ready again in the very next sequence', () => {
    const run = submitSequence(useTool(createRun(SEED, buildConfig()), 1));

    expect(isToolReady(run, getToolId(run, 1))).toBe(true);
  });

  it('keeps an unused tool ready after a submit', () => {
    const run = submitSequence(useTool(createRun(SEED, buildConfig()), 0));

    expect(isToolReady(run, getToolId(run, 1))).toBe(true);
  });

  it('moves an unused cooling tool one sequence closer to ready on each submit', () => {
    const config = buildConfig({ minSequencesPerShift: 5, maxSequencesPerShift: 5 });
    const afterUse = submitSequence(useTool(createRun(SEED, config), 0));
    const afterWait = submitSequence(afterUse);
    const toolId = getToolId(afterUse, 0);

    expect(findRunTool(afterWait, toolId)?.sequencesUntilReady).toBe(
      (findRunTool(afterUse, toolId)?.sequencesUntilReady ?? 0) - 1
    );
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
    const run = createRun(SEED, buildConfig());

    expect(() => applyRunMove(run, 'missing-tool', 0, 1)).toThrow();
  });

  it('throws when the tool was already used this sequence', () => {
    const run = useTool(createRun(SEED, buildConfig()), 1);

    expect(() => useTool(run, 1)).toThrow();
  });

  it('throws when the tool is still cooling down', () => {
    const run = submitSequence(useTool(createRun(SEED, buildConfig()), 0));

    expect(() => useTool(run, 0)).toThrow();
  });

  it('throws for an invalid index', () => {
    const run = createRun(SEED, buildConfig());

    expect(() => applyRunMove(run, getToolId(run, 1), 999)).toThrow();
  });
});

describe('canApplyRunMove', () => {
  it('is true for a legal move with a ready tool', () => {
    const run = createRun(SEED, buildConfig());
    const [move] = TOOL_REGISTRY.swap.generateMoves(run.sequence.cards);

    expect(canApplyRunMove(run, getToolId(run, 0), move.index, move.targetIndex)).toBe(true);
  });

  it('is false for an unknown tool id', () => {
    expect(canApplyRunMove(createRun(SEED, buildConfig()), 'missing-tool', 0, 1)).toBe(false);
  });

  it('is false for a tool already used this sequence', () => {
    const run = useTool(createRun(SEED, buildConfig()), 1);
    const [move] = TOOL_REGISTRY.promote.generateMoves(run.sequence.cards);

    expect(canApplyRunMove(run, getToolId(run, 1), move.index, move.targetIndex)).toBe(false);
  });

  it('is false for a tool that is cooling down', () => {
    const run = submitSequence(useTool(createRun(SEED, buildConfig()), 0));
    const [move] = TOOL_REGISTRY.swap.generateMoves(run.sequence.cards);

    expect(canApplyRunMove(run, getToolId(run, 0), move.index, move.targetIndex)).toBe(false);
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

  it('makes the undone tool ready again', () => {
    const run = undoRunMove(useTool(createRun(SEED, buildConfig()), 0));

    expect(isToolReady(run, getToolId(run, 0))).toBe(true);
  });

  it('only takes back the latest of several moves', () => {
    const afterFirstMove = useTool(createRun(SEED, buildConfig()), 0);
    const undone = undoRunMove(useTool(afterFirstMove, 1));

    expect(toValues(undone)).toEqual(toValues(afterFirstMove));
  });

  it('returns the run unchanged when there are no moves', () => {
    const run = createRun(SEED, buildConfig());

    expect(undoRunMove(run)).toBe(run);
  });
});

describe('closing a shift', () => {
  it('records the quota as met when banked yield exceeds the quota', () => {
    const run = submitSequence(createRun(SEED, buildConfig({ ...SINGLE_SEQUENCE_SHIFTS, quotaCurve: [0, 0] })));

    expect(run.completedShifts[0].wasQuotaMet).toBe(true);
  });

  it('adds no strike when the quota is met', () => {
    const run = submitSequence(createRun(SEED, buildConfig({ ...SINGLE_SEQUENCE_SHIFTS, quotaCurve: [0, 0] })));

    expect(run.strikes).toBe(0);
  });

  it('counts banked yield exactly equal to the quota as met', () => {
    const probe = createRun(SEED, buildConfig({ ...SINGLE_SEQUENCE_SHIFTS }));
    const exactQuota = calculateBatchScore(probe.sequence.cards);
    const run = submitSequence(createRun(SEED, buildConfig({ ...SINGLE_SEQUENCE_SHIFTS, quotaCurve: [exactQuota, 0] })));

    expect(run.completedShifts[0].wasQuotaMet).toBe(true);
  });

  it('adds a strike when the quota is missed', () => {
    const config = buildConfig({ ...SINGLE_SEQUENCE_SHIFTS, quotaCurve: [UNREACHABLE_QUOTA, 0], strikeLimit: 3 });

    expect(submitSequence(createRun(SEED, config)).strikes).toBe(1);
  });

  it('carries the shortfall into the next shift quota', () => {
    const config = buildConfig({ ...SINGLE_SEQUENCE_SHIFTS, quotaCurve: [UNREACHABLE_QUOTA, 50], strikeLimit: 3 });
    const initial = createRun(SEED, config);
    const shortfall = UNREACHABLE_QUOTA - calculateBatchScore(initial.sequence.cards);

    expect(submitSequence(initial).shift.quota).toBe(50 + shortfall);
  });

  it('does not carry surplus into the next shift quota', () => {
    const config = buildConfig({ ...SINGLE_SEQUENCE_SHIFTS, quotaCurve: [0, 50] });

    expect(submitSequence(createRun(SEED, config)).shift.quota).toBe(50);
  });

  it('starts the next shift at the first sequence with zero banked yield', () => {
    const run = submitSequence(createRun(SEED, buildConfig(SINGLE_SEQUENCE_SHIFTS)));

    expect([run.shift.index, run.shift.sequenceIndex, run.shift.bankedYield]).toEqual([1, 0, 0]);
  });

  it('makes every tool ready at the start of a new shift regardless of cooldowns', () => {
    const config = buildConfig({ ...SINGLE_SEQUENCE_SHIFTS, loadout: [{ type: 'swap', cooldown: 9 }] });
    const run = submitSequence(useTool(createRun(SEED, config), 0));

    expect(isToolReady(run, getToolId(run, 0))).toBe(true);
  });

  it('records the finished shift result', () => {
    const run = submitSequence(createRun(SEED, buildConfig(SINGLE_SEQUENCE_SHIFTS)));

    expect(run.completedShifts).toHaveLength(1);
  });
});

describe('run outcome', () => {
  const buildFinishedRun = (): RunState =>
    submitSequence(createRun(SEED, buildConfig({ ...SINGLE_SEQUENCE_SHIFTS, quotaCurve: [0] })));

  it('loses when the strike limit is reached', () => {
    const config = buildConfig({
      ...SINGLE_SEQUENCE_SHIFTS,
      quotaCurve: [UNREACHABLE_QUOTA, UNREACHABLE_QUOTA, 0],
      strikeLimit: 2,
    });

    expect(submitTimes(createRun(SEED, config), 2).status).toBe('LOST');
  });

  it('stays in progress one strike below the limit', () => {
    const config = buildConfig({ ...SINGLE_SEQUENCE_SHIFTS, quotaCurve: [UNREACHABLE_QUOTA, 0, 0], strikeLimit: 2 });

    expect(submitSequence(createRun(SEED, config)).status).toBe('IN_PROGRESS');
  });

  it('wins when the last shift is completed without reaching the strike limit', () => {
    const config = buildConfig({ ...SINGLE_SEQUENCE_SHIFTS, quotaCurve: [0, 0] });

    expect(submitTimes(createRun(SEED, config), 2).status).toBe('WON');
  });

  it('loses on the final shift when the last strike reaches the limit', () => {
    const config = buildConfig({ ...SINGLE_SEQUENCE_SHIFTS, quotaCurve: [0, UNREACHABLE_QUOTA], strikeLimit: 1 });

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
    const [move] = TOOL_REGISTRY.promote.generateMoves(finished.sequence.cards);

    expect(canApplyRunMove(finished, getToolId(finished, 1), move.index, move.targetIndex)).toBe(false);
  });
});
