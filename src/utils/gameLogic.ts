import { CardItem, ToolType, GamePhase, ToolInstance, ISortable, Move } from '../../types';
import { ALL_TOOL_TYPES, TOOL_META } from '../toolDefinitions';
import { TOOL_REGISTRY } from '../tools';
import { FLAVOR_DATABASE, FlavorKey } from '../config/flavorText';

export type SolverItem = ISortable;

export interface DailyState {
  date: string;
  moves: Move[];
  phase: GamePhase;
  tools: ToolInstance[];
}

export interface Solution {
  score: number;
  moves: Move[];
}

export interface InspectionYield {
  list: CardItem[];
  index: number;
  scoreDelta: number;
  detectedMode: 'ASC' | 'DESC' | null;
}

export function* createInspectionStream(initialList: CardItem[]): Generator<InspectionYield> {
  const list = initialList.map(item => ({ ...item }));
  let lastSurvivorVal: number | null = null;
  let lastSurvivorHasShield = false;
  let sortDirection: 'ASC' | 'DESC' | null = null;

  for (let i = 0; i < list.length; i++) {
    // 1. Yield Scanning State
    list[i] = { ...list[i], status: 'scanning' };
    yield {
      list: [...list],
      index: i,
      scoreDelta: 0,
      detectedMode: sortDirection
    };

    // 2. Process Logic
    const currentItem = list[i];
    const currentVal = currentItem.val;
    const currentHasShield = currentItem.hasShield || false;
    let survived = false;
    let pointsToAdd = 0;

    if (i === 0) {
      survived = true;
      lastSurvivorVal = currentVal;
      lastSurvivorHasShield = currentHasShield;
    } else if (i === 1) {
      survived = true;
      const prevVal = lastSurvivorVal!;
      if (currentVal >= prevVal) sortDirection = 'ASC';
      else sortDirection = 'DESC';
      lastSurvivorVal = currentVal;
      lastSurvivorHasShield = currentHasShield; // Update to current
    } else {
      // Logic for new Shield mechanic: "Select item to PROTECT"
      // Check Current Item Shield (Self-Protection)
      if (currentHasShield) {
        survived = true;
      } else {
        const threshold = lastSurvivorVal!;
        const mode = sortDirection || 'ASC';
        if (mode === 'ASC') {
          if (currentVal >= threshold) survived = true;
        } else {
          if (currentVal <= threshold) survived = true;
        }
      }

      if (survived) {
        lastSurvivorVal = currentVal;
        lastSurvivorHasShield = currentHasShield;
      }
    }

    // 3. Update Result State
    if (survived) {
      pointsToAdd = currentVal;
      list[i] = { ...currentItem, status: 'safe', linkScore: pointsToAdd };
    } else {
      list[i] = { ...currentItem, status: 'eliminated' };
    }

    // 4. Yield Result
    yield {
      list: [...list],
      index: i,
      scoreDelta: pointsToAdd,
      detectedMode: sortDirection
    };
  }
}

// Simple PRNG (Mulberry32)
function mulberry32(a: number) {
  return function () {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export const stringToSeed = (str: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
};

// Pure function to calculate score for a given number array
// Pure function to calculate score for a given number array
export const calculateBatchScore = (numbers: ISortable[]): number => {
  if (!numbers || numbers.length === 0) return 0;

  let score = 0;
  let lastSurvivor = 0;
  let lastSurvivorHasShield = false;
  let mode: 'ASC' | 'DESC' | null = null;

  // Iterate
  for (let i = 0; i < numbers.length; i++) {
    const item = numbers[i];
    const currentVal = item.val;
    const currentHasShield = item.hasShield || false;
    let survived = false;

    if (i === 0) {
      survived = true;
      lastSurvivor = currentVal;
      lastSurvivorHasShield = currentHasShield;
    } else if (i === 1) {
      survived = true;
      // Determine mode based on first two items
      if (currentVal >= lastSurvivor) mode = 'ASC';
      else mode = 'DESC';
    } else {
      // Check if protected by SELF shield
      if (currentHasShield) {
        survived = true;
      } else {
        // Normal logic
        const effectiveMode = mode || 'ASC';
        if (effectiveMode === 'ASC') {
          if (currentVal >= lastSurvivor) survived = true;
        } else {
          if (currentVal <= lastSurvivor) survived = true;
        }
      }
    }

    if (survived) {
      score += currentVal; // Scoring: Value of the survivor
      lastSurvivor = currentVal;
      lastSurvivorHasShield = currentHasShield;
    }
  }
  return score;
};

// Evaluate list to produce final scored items (for visual restoration)
export const gradeLevel = (list: CardItem[]): { score: number, gradedList: CardItem[] } => {
  if (list.length === 0) return { score: 0, gradedList: [] };

  const generator = createInspectionStream(list);
  let finalYield: InspectionYield | null = null;
  let totalScore = 0;

  let result = generator.next();
  while (!result.done) {
    finalYield = result.value;
    totalScore += finalYield.scoreDelta;
    result = generator.next();
  }

  // Use the list from the last yield, or original if empty
  const gradedList = finalYield ? finalYield.list : list;

  return { score: totalScore, gradedList };
};

// Recursive Solver to find the theoretical maximum score
export const findOptimalScore = (startList: CardItem[], availableTools?: ToolInstance[]): number => {
  // If no tools provided, default to standard set (legacy support or fallback)
  const defaultTools: ToolType[] = ['swap', 'purge', 'promote', 'demote'];
  const toolsToUse = availableTools ? availableTools.filter(t => !t.used).map(t => t.type) : defaultTools;

  const solution = findOptimalSolution(startList, toolsToUse);
  return solution.score;
};

// Recursive Solver to find the optimal solution (score + path)
// Note: availableTools here is a list of Types, representing the remaining usages.
export const findOptimalSolution = (startList: CardItem[], availableTools: ToolType[]): Solution => {
  // Convert to SolverItem for potentially rich state
  const initialNums: SolverItem[] = startList.map(item => ({ val: item.val, hasShield: item.hasShield }));

  let maxScore = -1; // Start with -1 to ensure we pick up 0 score if that's the best
  let bestMoves: Move[] = [];

  const search = (currentNums: SolverItem[], currentTools: ToolType[], currentMoves: Move[]) => {
    const currentScore = calculateBatchScore(currentNums);
    if (currentScore > maxScore) {
      maxScore = currentScore;
      bestMoves = [...currentMoves];
    }

    if (currentTools.length === 0) return;

    for (let t = 0; t < currentTools.length; t++) {
      const tool = currentTools[t];
      const nextTools = [...currentTools];
      nextTools.splice(t, 1);

      const strategy = TOOL_REGISTRY[tool];
      if (strategy) {
        const possibleMoves = strategy.generateMoves(currentNums);
        for (const move of possibleMoves) {
          // Apply move using the strategy logic (note: move.targetIndex corresponds to selection)
          const nextNums = strategy.apply(currentNums, move.index, move.targetIndex);
          search(nextNums, nextTools, [...currentMoves, move]);
        }
      }
    }
  };

  search(initialNums, availableTools, []);
  return { score: maxScore, moves: bestMoves };
};

// Recursive Solver to find the theoretical minimum score
export const findWorstScore = (startList: CardItem[], availableTools?: ToolInstance[]): number => {
  // If no tools provided, default to standard set (legacy support or fallback)
  const defaultTools: ToolType[] = ['swap', 'purge', 'promote', 'demote'];
  const toolsToUse = availableTools ? availableTools.filter(t => !t.used).map(t => t.type) : defaultTools;

  const solution = findWorstSolution(startList, toolsToUse);
  return solution.score;
};

// Recursive Solver to find the worst solution (score + path)
export const findWorstSolution = (startList: CardItem[], availableTools: ToolType[]): Solution => {
  // Convert to SolverItem for potentially rich state
  const initialNums: SolverItem[] = startList.map(item => ({ val: item.val, hasShield: item.hasShield }));

  let minScore = Infinity;
  let worstMoves: Move[] = [];

  const search = (currentNums: SolverItem[], currentTools: ToolType[], currentMoves: Move[]) => {
    const currentScore = calculateBatchScore(currentNums);
    if (currentScore < minScore) {
      minScore = currentScore;
      worstMoves = [...currentMoves];
    }

    if (currentTools.length === 0) return;

    for (let t = 0; t < currentTools.length; t++) {
      const tool = currentTools[t];
      const nextTools = [...currentTools];
      nextTools.splice(t, 1);

      const strategy = TOOL_REGISTRY[tool];
      if (strategy) {
        const possibleMoves = strategy.generateMoves(currentNums);
        for (const move of possibleMoves) {
          const nextNums = strategy.apply(currentNums, move.index, move.targetIndex);
          search(nextNums, nextTools, [...currentMoves, move]);
        }
      }
    }
  };

  search(initialNums, availableTools, []);

  // If initial score was never beaten (should be caught by first search call, but safety check)
  if (minScore === Infinity) return { score: calculateBatchScore(initialNums), moves: [] };

  return { score: minScore, moves: worstMoves };
};

export const calculateRelativeEfficiency = (userScore: number, optimal: number, worst: number): number => {
  if (optimal === worst) return 100;
  const efficiency = ((userScore - worst) / (optimal - worst)) * 100;
  return Math.max(0, Math.min(100, Math.round(efficiency)));
};



// Apply a move to a list and return the new list
export function applyMove<T extends ISortable>(list: T[], tool: ToolType, index: number, selection?: number | null): T[] {
  const strategy = TOOL_REGISTRY[tool];
  if (strategy) {
    // We cast to ISortable[] for the strategy, and rely on it returning T[] implicitly (same structure)
    // However, strategy.apply returns ISortable[]. We need to ensure types align.
    // T extends ISortable. Strategy returns ISortable[].
    // The strategies use `copy(list)` which maps `{...item}`. This preserves extra props like `id` if they exist on the input objects.
    // So passing `list` (T[]) into `strategy.apply` works at runtime.
    // TypeScript might complain about return type not being guaranteed T[].
    // We can cast the result.

    // Wait, strategy.apply takes ISortable[]. list is T[]. T extends ISortable. OK.
    // Returns ISortable[]. We need T[].
    // The implementation of strategies preserves properties via spread.
    return strategy.apply(list, index, selection !== null ? selection : undefined) as T[];
  }
  return list;
}

// Generate 4 tools from the pool
export const generateTools = (seed?: number): ToolInstance[] => {
  const random = seed !== undefined ? mulberry32(seed + 9999) : Math.random; // Offset seed slightly to not correlate with level gen
  const tools: ToolInstance[] = [];

  // Calculate total weight
  const totalWeight = ALL_TOOL_TYPES.reduce((sum, toolId) => {
    const def = TOOL_META[toolId.toUpperCase()];
    return sum + (def ? def.weight : 0);
  }, 0);

  // Pick 4 tools allowing duplicates
  for (let i = 0; i < 4; i++) {
    let threshold = random() * totalWeight;
    let selectedType: ToolType = ALL_TOOL_TYPES[0] as ToolType; // Default fallback

    for (const toolId of ALL_TOOL_TYPES) {
      const def = TOOL_META[toolId.toUpperCase()];
      const weight = def ? def.weight : 0;
      threshold -= weight;
      if (threshold < 0) {
        selectedType = toolId as ToolType;
        break;
      }
    }

    tools.push({
      instanceId: `tool-${i}-${Math.random().toString(36).substr(2, 5)}`,
      type: selectedType,
      used: false
    });
  }
  return tools;
};

// Utility to generate random levels
export const generateLevel = (length: number, seed?: number): CardItem[] => {
  // Setup Random Generator
  const random = seed !== undefined ? mulberry32(seed) : Math.random;

  // Generate numbers from 1 to N*2
  const maxVal = length * 2;
  const pool = Array.from({ length: maxVal }, (_, i) => i + 1);

  // Fisher-Yates Shuffle the pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Select the first 'length' numbers
  const numbers = pool.slice(0, length);

  return numbers.map(val => {
    // We also want deterministic IDs if seeded, to avoid hydration mismatches or randomness
    const idSuffix = seed !== undefined
      ? Math.floor(random() * 1000000).toString(36)
      : Math.random().toString(36).substring(2, 9);

    return {
      id: idSuffix,
      val: val,
      status: 'pending',
      linkScore: null
    };
  });
};


export const generateFlavorMap = (seed?: number): Record<FlavorKey, string> => {
  const random = seed !== undefined ? mulberry32(seed + 777) : Math.random; // Offset seed
  const keys: FlavorKey[] = ["DONE", "ACCEPTABLE", "ADEQUATE", "NORMAL", "CONCERNED", "HOSTILE", "SUSPICIOUS"];
  const map = {} as Record<FlavorKey, string>;

  keys.forEach(key => {
    const options = FLAVOR_DATABASE[key];
    // Weighted random selection based on seed
    const totalWeight = options.reduce((sum, item) => sum + item.weight, 0);
    let r = random() * totalWeight;
    let selected = options[0].text;

    for (const item of options) {
      r -= item.weight;
      if (r < 0) {
        selected = item.text;
        break;
      }
    }
    map[key] = selected;
  });

  return map;
};
