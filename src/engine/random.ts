export type RandomSource = () => number;

/** Mulberry32: a small deterministic PRNG returning floats in [0, 1). */
export const createSeededRandom = (seed: number): RandomSource => {
  let state = seed;
  return () => {
    let t = state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

/** FNV-1a hash, so a readable seed (a date, a shared code) maps to a number. */
export const stringToSeed = (str: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
};
