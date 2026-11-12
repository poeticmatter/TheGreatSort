import { generateLevel } from '../generation.ts';
import { createSeededRandom, RandomSource, stringToSeed } from '../random.ts';
import { CardItem } from '../types.ts';
import { RunConfig } from './runTypes.ts';

// Every random draw in a run is derived from the run seed plus a label and
// position, never from a shared stream. A sequence therefore depends only on
// where it sits in the run, not on what the player did before reaching it.
const deriveSeed = (runSeed: number, label: string, ...position: number[]): number =>
  stringToSeed([runSeed, label, ...position].join(':'));

const drawWithoutReplacement = <T>(items: T[], count: number, random: RandomSource): T[] => {
  const remaining = [...items];
  const drawn: T[] = [];
  while (drawn.length < count && remaining.length > 0) {
    const [item] = remaining.splice(Math.floor(random() * remaining.length), 1);
    drawn.push(item);
  }
  return drawn;
};

/**
 * Stars some of the sequence's lowest values. Low numbers are worth little
 * yield, so keeping one alive competes with sorting for the quota.
 */
const starLowCards = (cards: CardItem[], config: RunConfig, random: RandomSource): CardItem[] => {
  const lowestCards = [...cards].sort((a, b) => a.val - b.val).slice(0, config.starPoolSize);
  const starredIds = new Set(drawWithoutReplacement(lowestCards, config.starsPerSequence, random).map(card => card.id));

  return cards.map(card => (starredIds.has(card.id) ? { ...card, isStarred: true } : card));
};

export const generateRunSequence = (
  runSeed: number,
  config: RunConfig,
  shiftIndex: number,
  sequenceIndex: number
): CardItem[] => {
  const cards = generateLevel(config.sequenceLength, deriveSeed(runSeed, 'sequence', shiftIndex, sequenceIndex));
  const starRandom = createSeededRandom(deriveSeed(runSeed, 'stars', shiftIndex, sequenceIndex));

  return starLowCards(cards, config, starRandom);
};
