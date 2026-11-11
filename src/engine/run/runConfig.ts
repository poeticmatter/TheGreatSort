import { RunConfig } from './runTypes.ts';

// Starting values for the first playable run. They are tuned against the
// simulation report (`npm run simulate`), not against any single seed.
export const DEFAULT_RUN_CONFIG: RunConfig = {
  quotaCurve: [215, 230, 245, 260],
  minSequencesPerShift: 5,
  maxSequencesPerShift: 6,
  sequenceLength: 8,
  strikeLimit: 3,
  loadout: [
    { type: 'swap', cooldown: 2 },
    { type: 'promote', cooldown: 3 },
    { type: 'demote', cooldown: 3 },
    { type: 'hop', cooldown: 3 },
    { type: 'longswap', cooldown: 5 },
  ],
};
