import { RunConfig } from './runTypes.ts';

// Starting values for the first playable run. They are tuned against the
// simulation report (`npm run simulate`), not against any single seed.
export const DEFAULT_RUN_CONFIG: RunConfig = {
  quotaCurve: [205, 215, 225, 235],
  sequencesPerShift: 6,
  sequenceLength: 8,
  strikeLimit: 3,
  loadout: [
    { type: 'swap', baseCost: 1 },
    { type: 'promote', baseCost: 2 },
    { type: 'longswap', baseCost: 3 },
  ],
  energy: {
    capacity: 8,
    startingEnergy: 4,
    perSequence: 1,
    shiftBonus: 4,
    repeatUseSurcharge: 1,
  },
  starsPerSequence: 1,
  starPoolSize: 3,
};
