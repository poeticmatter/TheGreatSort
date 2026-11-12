import { RunConfig } from './runTypes.ts';

// Starting values for the first playable run. They are tuned against the
// simulation report (`npm run simulate`), not against any single seed.
export const DEFAULT_RUN_CONFIG: RunConfig = {
  quotaCurve: [305, 320, 335, 350],
  sequencesPerShift: 6,
  sequenceLength: 8,
  strikeLimit: 3,
  loadout: [
    { type: 'swap', cost: 2 },
    { type: 'promote', cost: 2 },
    { type: 'longswap', cost: 3 },
  ],
  energy: {
    capacity: 12,
    startingEnergy: 6,
    perSequence: 5,
    shiftBonus: 5,
  },
  starsPerSequence: 1,
  starPoolSize: 3,
};
