import { describe, expect, it } from 'vitest';

import { TOOL_REGISTRY } from '../tools/index.ts';
import { canAffordTool } from './runSelectors.ts';
import { applyRunMove, canApplyRunMove, createRun, submitSequence, undoRunMove } from './runTransitions.ts';
import { EnergyConfig, RunConfig, RunState } from './runTypes.ts';

const SEED = 4242;
const CAPACITY = 20;
const STARTING_ENERGY = 10;
const PER_SEQUENCE = 2;
const SHIFT_BONUS = 4;
const REPEAT_USE_COUNT = 2;
const SWAP_COST = 3;
const PROMOTE_COST = 2;
const SWAP_POSITION = 0;
const PROMOTE_POSITION = 1;

const buildEnergy = (overrides: Partial<EnergyConfig> = {}): EnergyConfig => ({
  capacity: CAPACITY,
  startingEnergy: STARTING_ENERGY,
  perSequence: PER_SEQUENCE,
  shiftBonus: SHIFT_BONUS,
  ...overrides,
});

const buildConfig = (overrides: Partial<RunConfig> = {}, energy: Partial<EnergyConfig> = {}): RunConfig => ({
  quotaCurve: [0, 0, 0],
  sequencesPerShift: 3,
  sequenceLength: 8,
  strikeLimit: 2,
  loadout: [
    { type: 'swap', cost: SWAP_COST },
    { type: 'promote', cost: PROMOTE_COST },
  ],
  energy: buildEnergy(energy),
  starsPerSequence: 1,
  starPoolSize: 3,
  ...overrides,
});

const useTool = (run: RunState, position: number): RunState => {
  const tool = run.tools[position];
  const [move] = TOOL_REGISTRY[tool.type].generateMoves(run.sequence.cards);
  return applyRunMove(run, tool.id, move.index, move.targetIndex);
};

describe('createRun energy', () => {
  it('starts with the configured starting energy', () => {
    expect(createRun(SEED, buildConfig()).energy).toBe(STARTING_ENERGY);
  });

  it('accepts starting energy equal to the capacity', () => {
    expect(() => createRun(SEED, buildConfig({}, { startingEnergy: CAPACITY }))).not.toThrow();
  });

  it('accepts a starting energy of zero', () => {
    expect(() => createRun(SEED, buildConfig({}, { startingEnergy: 0 }))).not.toThrow();
  });

  it('throws when starting energy is negative', () => {
    expect(() => createRun(SEED, buildConfig({}, { startingEnergy: -1 }))).toThrow();
  });

  it('throws when starting energy exceeds the capacity', () => {
    expect(() => createRun(SEED, buildConfig({}, { startingEnergy: CAPACITY + 1 }))).toThrow();
  });
});

describe('paying for moves', () => {
  it('charges the tool cost', () => {
    const run = useTool(createRun(SEED, buildConfig()), SWAP_POSITION);

    expect(run.energy).toBe(STARTING_ENERGY - SWAP_COST);
  });

  it('records the energy paid on the move', () => {
    const run = useTool(createRun(SEED, buildConfig()), SWAP_POSITION);

    expect(run.sequence.moves[0].energySpent).toBe(SWAP_COST);
  });

  it('charges the flat cost again on every repeat use of a tool', () => {
    const run = useTool(useTool(createRun(SEED, buildConfig()), SWAP_POSITION), SWAP_POSITION);

    expect(run.energy).toBe(STARTING_ENERGY - REPEAT_USE_COUNT * SWAP_COST);
  });

  it('allows the same tool to be used repeatedly in one sequence', () => {
    const run = useTool(useTool(createRun(SEED, buildConfig()), SWAP_POSITION), SWAP_POSITION);

    expect(run.sequence.moves).toHaveLength(REPEAT_USE_COUNT);
  });

  it('throws when the tool costs more than the energy left', () => {
    const run = createRun(SEED, buildConfig({}, { startingEnergy: SWAP_COST - 1 }));

    expect(() => useTool(run, SWAP_POSITION)).toThrow();
  });

  it('throws when a repeat use costs more than the energy left', () => {
    const run = useTool(createRun(SEED, buildConfig({}, { startingEnergy: SWAP_COST })), SWAP_POSITION);

    expect(() => useTool(run, SWAP_POSITION)).toThrow();
  });

  it('rejects an unaffordable move through canApplyRunMove', () => {
    const run = createRun(SEED, buildConfig({}, { startingEnergy: SWAP_COST - 1 }));
    const [move] = TOOL_REGISTRY.swap.generateMoves(run.sequence.cards);

    expect(canApplyRunMove(run, run.tools[SWAP_POSITION].id, move.index, move.targetIndex)).toBe(false);
  });

  it('still allows a cheaper tool when an expensive one cannot be afforded', () => {
    const run = createRun(SEED, buildConfig({}, { startingEnergy: PROMOTE_COST }));

    expect([canAffordTool(run, run.tools[SWAP_POSITION].id), canAffordTool(run, run.tools[PROMOTE_POSITION].id)]).toEqual([
      false,
      true,
    ]);
  });

  it('allows a move that costs exactly the energy left', () => {
    const run = useTool(createRun(SEED, buildConfig({}, { startingEnergy: SWAP_COST })), SWAP_POSITION);

    expect(run.energy).toBe(0);
  });
});

describe('undoing a paid move', () => {
  it('refunds the energy the move cost', () => {
    const run = undoRunMove(useTool(createRun(SEED, buildConfig()), SWAP_POSITION));

    expect(run.energy).toBe(STARTING_ENERGY);
  });

  it('refunds only the latest of several uses of a tool', () => {
    const twice = useTool(useTool(createRun(SEED, buildConfig()), SWAP_POSITION), SWAP_POSITION);
    const run = undoRunMove(twice);

    expect(run.energy).toBe(STARTING_ENERGY - SWAP_COST);
  });
});

describe('restoring energy on submit', () => {
  it('adds the per-sequence energy when the next sequence loads', () => {
    const run = submitSequence(createRun(SEED, buildConfig()));

    expect(run.energy).toBe(STARTING_ENERGY + PER_SEQUENCE);
  });

  it('keeps unspent energy when the next sequence loads', () => {
    const run = submitSequence(useTool(createRun(SEED, buildConfig()), SWAP_POSITION));

    expect(run.energy).toBe(STARTING_ENERGY - SWAP_COST + PER_SEQUENCE);
  });

  it('never restores energy past the capacity between sequences', () => {
    const run = submitSequence(createRun(SEED, buildConfig({}, { startingEnergy: CAPACITY })));

    expect(run.energy).toBe(CAPACITY);
  });

  it('adds the shift bonus instead of the per-sequence energy when a new shift starts', () => {
    const run = submitSequence(createRun(SEED, buildConfig({ sequencesPerShift: 1 })));

    expect(run.energy).toBe(STARTING_ENERGY + SHIFT_BONUS);
  });

  it('carries leftover energy into the next shift', () => {
    const spent = useTool(createRun(SEED, buildConfig({ sequencesPerShift: 1 })), SWAP_POSITION);

    expect(submitSequence(spent).energy).toBe(STARTING_ENERGY - SWAP_COST + SHIFT_BONUS);
  });

  it('never restores energy past the capacity at a new shift', () => {
    const run = submitSequence(createRun(SEED, buildConfig({ sequencesPerShift: 1 }, { startingEnergy: CAPACITY })));

    expect(run.energy).toBe(CAPACITY);
  });
});
