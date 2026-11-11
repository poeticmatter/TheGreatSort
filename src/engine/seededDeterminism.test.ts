import { describe, expect, it } from 'vitest';

import { generateLevel, generateTools, gradeLevel, stringToSeed, solve } from './index.ts';

// Seeded output is a compatibility contract: a daily run, a shared seed and a
// simulation report must all reproduce exactly. These snapshots fail if any
// change alters what a given seed generates or how it is graded.
const SEED = stringToSeed('2026-01-01');

describe('seeded determinism', () => {
  it('hashes a seed string to the same number', () => {
    expect(SEED).toMatchInlineSnapshot(`2049302883`);
  });

  it('generates the same sequence for a seed', () => {
    const values = generateLevel(8, SEED).map(card => card.val);

    expect(values).toMatchInlineSnapshot(`
      [
        16,
        3,
        2,
        15,
        9,
        1,
        5,
        7,
      ]
    `);
  });

  it('generates the same card ids for a seed', () => {
    const ids = generateLevel(4, SEED).map(card => card.id);

    expect(ids).toMatchInlineSnapshot(`
      [
        "78ph",
        "i0jo",
        "dikt",
        "133i",
      ]
    `);
  });

  it('generates the same tools for a seed', () => {
    const tools = generateTools(SEED).map(tool => `${tool.type}:${tool.instanceId}`);

    expect(tools).toMatchInlineSnapshot(`
      [
        "swap:tool-0-b37n",
        "sink:tool-1-9397",
        "halve:tool-2-9jda",
        "demote:tool-3-fil",
      ]
    `);
  });

  it('grades a seeded sequence to the same survivors and yield', () => {
    const { score, gradedList } = gradeLevel(generateLevel(8, SEED));

    expect({ score, statuses: gradedList.map(card => card.status) }).toMatchInlineSnapshot(`
      {
        "score": 22,
        "statuses": [
          "safe",
          "safe",
          "safe",
          "eliminated",
          "eliminated",
          "safe",
          "eliminated",
          "eliminated",
        ],
      }
    `);
  });

  it('finds the same best and worst yields for a seeded sequence and toolset', () => {
    const sequence = generateLevel(6, SEED);
    const toolTypes = generateTools(SEED).map(tool => tool.type);

    const best = solve(sequence, toolTypes, 'MAX');
    const worst = solve(sequence, toolTypes, 'MIN');

    expect({
      bestYield: best.maxYield,
      bestMoves: best.bestSolution,
      worstYield: worst.maxYield,
    }).toMatchInlineSnapshot(`
      {
        "bestMoves": [
          {
            "i": 4,
            "tool": "swap",
          },
          {
            "i": 2,
            "tool": "sink",
          },
          {
            "i": 1,
            "tool": "demote",
          },
        ],
        "bestYield": 31,
        "worstYield": 1,
      }
    `);
  });
});
