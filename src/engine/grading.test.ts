import { describe, expect, it } from 'vitest';

import { calculateBatchScore, countStarredSurvivors, gradeLevel, listSurvivors } from './grading.ts';
import { AgentRole, CardItem } from './types.ts';

const toCards = (values: number[], shieldedIndices: number[] = [], starredIndices: number[] = []): CardItem[] =>
  values.map((val, index) => ({
    id: `card-${index}`,
    val,
    status: 'pending',
    role: AgentRole.NONE,
    hasShield: shieldedIndices.includes(index),
    isStarred: starredIndices.includes(index),
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

const survivorIds = (cards: CardItem[]) => listSurvivors(cards).map(card => card.id);

describe('listSurvivors', () => {
  it('returns the surviving cards in order', () => {
    expect(survivorIds(toCards([1, 3, 2, 4]))).toEqual(['card-0', 'card-1', 'card-3']);
  });

  it('always keeps the first card', () => {
    expect(survivorIds(toCards([9]))).toEqual(['card-0']);
  });

  it('keeps a shielded card that is out of order', () => {
    expect(survivorIds(toCards([1, 5, 2], [2]))).toEqual(['card-0', 'card-1', 'card-2']);
  });

  it('returns nothing for an empty sequence', () => {
    expect(listSurvivors([])).toEqual([]);
  });

  it('sums to the batch score', () => {
    const cards = toCards([5, 3, 4, 1]);

    expect(listSurvivors(cards).reduce((total, card) => total + card.val, 0)).toBe(calculateBatchScore(cards));
  });
});

describe('countStarredSurvivors', () => {
  it('counts a starred card that survives', () => {
    expect(countStarredSurvivors(toCards([1, 2, 3], [], [1]))).toBe(1);
  });

  it('does not count a starred card that is eliminated', () => {
    expect(countStarredSurvivors(toCards([1, 3, 2, 4], [], [2]))).toBe(0);
  });

  it('counts a starred first card', () => {
    expect(countStarredSurvivors(toCards([4, 5, 6], [], [0]))).toBe(1);
  });

  it('ignores surviving cards that are not starred', () => {
    expect(countStarredSurvivors(toCards([1, 2, 3]))).toBe(0);
  });

  it('counts a starred card kept alive by a shield', () => {
    expect(countStarredSurvivors(toCards([1, 5, 2], [2], [2]))).toBe(1);
  });
});
