import { describe, expect, it } from 'vitest';

import { applyMove } from './moves.ts';
import { ISortable, ToolType } from './types.ts';

const START_VALUES = [5, 1, 4, 2, 3];

const toSequence = (values: number[]): ISortable[] => values.map(val => ({ val }));
const toValues = (sequence: ISortable[]): number[] => sequence.map(item => item.val);

interface ToolCase {
  tool: ToolType;
  index: number;
  selection?: number;
  expected: number[];
}

const TOOL_CASES: ToolCase[] = [
  { tool: 'demote', index: 1, expected: [5, 4, 2, 3, 1] },
  { tool: 'promote', index: 3, expected: [2, 5, 1, 4, 3] },
  { tool: 'swap', index: 1, selection: 2, expected: [5, 4, 1, 2, 3] },
  { tool: 'longswap', index: 0, selection: 4, expected: [3, 1, 4, 2, 5] },
  { tool: 'transfer', index: 0, selection: 2, expected: [7, 1, 2, 2, 3] },
  { tool: 'sink', index: 0, selection: 1, expected: [1, 1, 4, 2, 3] },
  { tool: 'halve', index: 0, expected: [2, 1, 4, 2, 3] },
  { tool: 'shield', index: 1, expected: [1, 4, 2, 3] },
  { tool: 'shrink', index: 0, expected: [2, 1, 4, 2, 3] },
  { tool: 'hop', index: 2, expected: [5, 2, 4, 1, 3] },
  { tool: 'mirror', index: 0, expected: [3, 1, 4, 2, 5] },
  { tool: 'cycle', index: 3, selection: 2, expected: [5, 2, 1, 4, 3] },
  { tool: 'equalize', index: 0, selection: 2, expected: [4, 1, 4, 2, 3] },
];

describe('applyMove', () => {
  it.each(TOOL_CASES)('applies $tool to the sequence', ({ tool, index, selection, expected }) => {
    const { newList } = applyMove(toSequence(START_VALUES), tool, index, selection);

    expect(toValues(newList)).toEqual(expected);
  });

  it.each(TOOL_CASES)('leaves the original sequence untouched when applying $tool', ({ tool, index, selection }) => {
    const sequence = toSequence(START_VALUES);

    applyMove(sequence, tool, index, selection);

    expect(toValues(sequence)).toEqual(START_VALUES);
  });

  it('marks the protected card as shielded when applying shield', () => {
    const { newList } = applyMove(toSequence(START_VALUES), 'shield', 1);

    expect(newList[0]).toEqual({ val: 1, hasShield: true });
  });

  it('reports both picked positions as impacted for a swap', () => {
    const { impactedIndices } = applyMove(toSequence(START_VALUES), 'swap', 1, 2);

    expect(impactedIndices).toEqual([1, 2]);
  });

  it('reports only the picked position as impacted for a single-target tool', () => {
    const { impactedIndices } = applyMove(toSequence(START_VALUES), 'halve', 0);

    expect(impactedIndices).toEqual([0]);
  });
});
