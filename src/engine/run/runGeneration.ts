import { generateLevel } from '../generation.ts';
import { createSeededRandom, stringToSeed } from '../random.ts';
import { CardItem } from '../types.ts';
import { RunConfig } from './runTypes.ts';

// Every random draw in a run is derived from the run seed plus a label and
// position, never from a shared stream. A sequence therefore depends only on
// where it sits in the run, not on what the player did before reaching it.
const deriveSeed = (runSeed: number, label: string, ...position: number[]): number =>
  stringToSeed([runSeed, label, ...position].join(':'));

/** The hidden number of sequences in a shift. */
export const generateShiftSequenceCount = (runSeed: number, config: RunConfig, shiftIndex: number): number => {
  const random = createSeededRandom(deriveSeed(runSeed, 'shift-length', shiftIndex));
  const span = config.maxSequencesPerShift - config.minSequencesPerShift + 1;
  return config.minSequencesPerShift + Math.floor(random() * span);
};

export const generateRunSequence = (
  runSeed: number,
  config: RunConfig,
  shiftIndex: number,
  sequenceIndex: number
): CardItem[] =>
  generateLevel(config.sequenceLength, deriveSeed(runSeed, 'sequence', shiftIndex, sequenceIndex));
