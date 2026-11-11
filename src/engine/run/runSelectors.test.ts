import { describe, expect, it } from 'vitest';

import { TOOL_REGISTRY } from '../tools/index.ts';
import { findRunTool, getPaceHint, getReadyTools, getShiftCount, isToolReady, isToolUsedThisSequence } from './runSelectors.ts';
import { applyRunMove, createRun, submitSequence } from './runTransitions.ts';
import { PaceHint, RunConfig, RunState } from './runTypes.ts';

const SEED = 99;
const SEQUENCES_PER_SHIFT = 9;

const config: RunConfig = {
  quotaCurve: [0, 0, 0],
  minSequencesPerShift: 4,
  maxSequencesPerShift: 4,
  sequenceLength: 8,
  strikeLimit: 2,
  loadout: [
    { type: 'swap', cooldown: 2 },
    { type: 'promote', cooldown: 0 },
  ],
};

const useTool = (run: RunState, position: number): RunState => {
  const tool = run.tools[position];
  const [move] = TOOL_REGISTRY[tool.type].generateMoves(run.sequence.cards);
  return applyRunMove(run, tool.id, move.index, move.targetIndex);
};

const withProgress = (run: RunState, sequenceIndex: number): RunState => ({
  ...run,
  shift: { ...run.shift, sequenceIndex, sequenceCount: SEQUENCES_PER_SHIFT },
});

const getHintAt = (sequenceIndex: number): PaceHint =>
  getPaceHint(withProgress(createRun(SEED, config), sequenceIndex));

describe('findRunTool', () => {
  it('finds a tool by id', () => {
    const run = createRun(SEED, config);

    expect(findRunTool(run, run.tools[1].id)).toBe(run.tools[1]);
  });

  it('returns undefined for an unknown id', () => {
    expect(findRunTool(createRun(SEED, config), 'missing-tool')).toBeUndefined();
  });
});

describe('isToolReady', () => {
  it('is true for an unused tool at the start of a run', () => {
    const run = createRun(SEED, config);

    expect(isToolReady(run, run.tools[0].id)).toBe(true);
  });

  it('is false for a tool used this sequence', () => {
    const run = useTool(createRun(SEED, config), 0);

    expect(isToolReady(run, run.tools[0].id)).toBe(false);
  });

  it('is false for a tool that is cooling down', () => {
    const run = submitSequence(useTool(createRun(SEED, config), 0));

    expect(isToolReady(run, run.tools[0].id)).toBe(false);
  });

  it('is false for an unknown tool id', () => {
    expect(isToolReady(createRun(SEED, config), 'missing-tool')).toBe(false);
  });
});

describe('isToolUsedThisSequence', () => {
  it('is true after the tool was used', () => {
    const run = useTool(createRun(SEED, config), 0);

    expect(isToolUsedThisSequence(run, run.tools[0].id)).toBe(true);
  });

  it('is false for a tool that was not used', () => {
    const run = useTool(createRun(SEED, config), 0);

    expect(isToolUsedThisSequence(run, run.tools[1].id)).toBe(false);
  });
});

describe('getReadyTools', () => {
  it('lists every tool at the start of a run', () => {
    expect(getReadyTools(createRun(SEED, config))).toHaveLength(2);
  });

  it('excludes tools that were used or are cooling down', () => {
    const run = submitSequence(useTool(createRun(SEED, config), 0));

    expect(getReadyTools(run).map(tool => tool.type)).toEqual(['promote']);
  });
});

describe('getPaceHint', () => {
  it('is EARLY at the start of a shift', () => {
    expect(getHintAt(0)).toBe('EARLY');
  });

  it('is EARLY just below one third progress', () => {
    expect(getHintAt(2)).toBe('EARLY');
  });

  it('is MIDWAY at exactly one third progress', () => {
    expect(getHintAt(3)).toBe('MIDWAY');
  });

  it('is MIDWAY just below two thirds progress', () => {
    expect(getHintAt(5)).toBe('MIDWAY');
  });

  it('is WINDING_DOWN at exactly two thirds progress', () => {
    expect(getHintAt(6)).toBe('WINDING_DOWN');
  });

  it('is WINDING_DOWN in the last sequence', () => {
    expect(getHintAt(SEQUENCES_PER_SHIFT - 1)).toBe('WINDING_DOWN');
  });
});

describe('getShiftCount', () => {
  it('equals the length of the quota curve', () => {
    expect(getShiftCount(createRun(SEED, config))).toBe(3);
  });
});
