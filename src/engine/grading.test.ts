import { describe, expect, it } from 'vitest';

import { calculateBatchScore, gradeLevel } from './grading.ts';
import { AgentRole, CardItem } from './types.ts';

const toCards = (values: number[], shieldedIndices: number[] = []): CardItem[] =>
  values.map((val, index) => ({
    id: `card-${index}`,
    val,
    status: 'pending',
    role: AgentRole.NONE,
    hasShield: shieldedIndices.includes(index),
  }));

const gradeStatuses = (cards: CardItem[]) => gradeLevel(cards).gradedList.map(card => card.status);

describe('gradeLevel', () => {
  it('eliminates a card that breaks an ascending run', () => {
    expect(gradeStatuses(toCards([1, 3, 2, 4]))).toEqual(['safe', 'safe', 'eliminated', 'safe']);
  });

  it('eliminates a card that breaks a descending run', () => {
    expect(gradeStatuses(toCards([5, 3, 4, 1]))).toEqual(['safe', 'safe', 'eliminated', 'safe']);
  });

  it('sums the values of surviving cards as the yield', () => {
    expect(gradeLevel(toCards([1, 3, 2, 4])).score).toBe(8);
  });

  it('lets equal values survive before a direction is established', () => {
    expect(gradeStatuses(toCards([2, 2, 1, 3]))).toEqual(['safe', 'safe', 'safe', 'eliminated']);
  });

  it('lets a value equal to the last survivor survive once a direction is set', () => {
    expect(gradeStatuses(toCards([1, 2, 2]))).toEqual(['safe', 'safe', 'safe']);
  });

  it('keeps a shielded card that is out of order', () => {
    expect(gradeStatuses(toCards([1, 5, 2], [2]))).toEqual(['safe', 'safe', 'safe']);
  });

  it('compares later cards against a surviving shielded card', () => {
    expect(gradeStatuses(toCards([1, 5, 2, 3], [2]))).toEqual(['safe', 'safe', 'safe', 'safe']);
  });

  it('yields nothing for an empty sequence', () => {
    expect(gradeLevel([])).toEqual({ score: 0, gradedList: [] });
  });

  it('does not change the status of the cards it was given', () => {
    const cards = toCards([1, 3, 2]);

    gradeLevel(cards);

    expect(cards.map(card => card.status)).toEqual(['pending', 'pending', 'pending']);
  });
});

describe('calculateBatchScore', () => {
  it.each([
    { values: [1, 3, 2, 4], shielded: [] },
    { values: [5, 3, 4, 1], shielded: [] },
    { values: [1, 5, 2, 3], shielded: [2] },
    { values: [], shielded: [] },
  ])('matches the graded yield for $values', ({ values, shielded }) => {
    const cards = toCards(values, shielded);

    expect(calculateBatchScore(cards)).toBe(gradeLevel(cards).score);
  });
});
