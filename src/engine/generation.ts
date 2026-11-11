import { createSeededRandom, RandomSource } from './random.ts';
import { ALL_TOOL_TYPES, TOOL_META } from './toolDefinitions.ts';
import { AgentRole, CardItem, ToolInstance, ToolType } from './types.ts';

const TOOLS_PER_PUZZLE = 4;
// Keeps the tool stream independent of the sequence stream for the same seed.
const TOOL_SEED_OFFSET = 9999;
const ID_RANGE = 1000000;
const ID_RADIX = 36;

const getToolWeight = (toolId: string): number => {
  const definition = TOOL_META[toolId.toUpperCase()];
  return definition ? definition.weight : 0;
};

const pickWeightedToolType = (random: RandomSource, totalWeight: number): ToolType => {
  let threshold = random() * totalWeight;

  for (const toolId of ALL_TOOL_TYPES) {
    threshold -= getToolWeight(toolId);
    if (threshold < 0) return toolId;
  }
  return ALL_TOOL_TYPES[0];
};

/** Draws a puzzle's tools from the pool, weighted by each tool's rarity. */
export const generateTools = (seed?: number): ToolInstance[] => {
  const random = seed !== undefined ? createSeededRandom(seed + TOOL_SEED_OFFSET) : Math.random;
  const totalWeight = ALL_TOOL_TYPES.reduce((sum, toolId) => sum + getToolWeight(toolId), 0);
  const tools: ToolInstance[] = [];

  for (let i = 0; i < TOOLS_PER_PUZZLE; i++) {
    const type = pickWeightedToolType(random, totalWeight);
    tools.push({
      instanceId: `tool-${i}-${Math.floor(random() * ID_RANGE).toString(ID_RADIX)}`,
      type,
      used: false
    });
  }
  return tools;
};

/** Generates a sequence of distinct values drawn from 1..2*length. */
export const generateLevel = (length: number, seed?: number): CardItem[] => {
  const random = seed !== undefined ? createSeededRandom(seed) : Math.random;

  const maxVal = length * 2;
  const pool = Array.from({ length: maxVal }, (_, i) => i + 1);

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const numbers = pool.slice(0, length);

  return numbers.map(val => {
    const id = seed !== undefined
      ? Math.floor(random() * ID_RANGE).toString(ID_RADIX)
      : Math.random().toString(ID_RADIX).substring(2, 9);

    return {
      id,
      val,
      status: 'pending',
      role: AgentRole.NONE,
    };
  });
};
