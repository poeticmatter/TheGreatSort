import { CardItem, ToolType, GamePhase, ToolInstance, ISortable, Move, HiddenRole, UserTag, ResistanceStatus } from '../../types';
import { ALL_TOOL_TYPES, TOOL_META } from '../toolDefinitions';
import { TOOL_REGISTRY } from '../tools';
import { FLAVOR_DATABASE, FlavorKey } from '../config/flavorText';
import { calculateBatchScore, judgeStep, solve, DailyPuzzleMove, SolverItem } from './solverCore';

export { calculateBatchScore, judgeStep };



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

    if (lastSurvivorVal === null) {
      // This is effectively the first item (or first non-eliminated item)
      survived = true;
      pointsToAdd = currentVal; // Include first item's value
      lastSurvivorVal = currentVal;
      lastSurvivorHasShield = currentHasShield;
    } else {
      // Use judgeStep to determine outcome
      const result = judgeStep(currentVal, currentHasShield, lastSurvivorVal, sortDirection);
      survived = result.survived;

      // Update State if Survived
      if (survived) {
        sortDirection = result.newMode;
        pointsToAdd = currentVal; // Add survivor's value (not scoreToAdd)
        lastSurvivorVal = currentVal;
        lastSurvivorHasShield = currentHasShield;
      }
    }

    // 3. Update Result State
    if (survived) {
      list[i] = { ...currentItem, status: 'safe' };
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
  const defaultTools: ToolType[] = ['swap', 'promote', 'demote'];
  const toolsToUse = availableTools ? availableTools.filter(t => !t.used).map(t => t.type) : defaultTools;

  const solution = findOptimalSolution(startList, toolsToUse);
  return solution.score;
};

// Recursive Solver to find the optimal solution (score + path)
// Note: availableTools here is a list of Types, representing the remaining usages.
// Recursive Solver to find the optimal solution (score + path)
// Note: availableTools here is a list of Types, representing the remaining usages.
export const findOptimalSolution = (startList: CardItem[], availableTools: ToolType[]): Solution => {
  // Convert to SolverItem for potentially rich state
  const initialNums: SolverItem[] = startList.map(item => ({ val: item.val, hasShield: item.hasShield }));

  // Use the unified solver core
  const result = solve(initialNums, availableTools);

  // Map DailyPuzzleMove[] back to Move[]
  const moves: Move[] = result.bestSolution.map(m => ({
    tool: m.tool as ToolType,
    index: m.i,
    targetIndex: m.t,
    description: '' // Fallback description
  }));

  return { score: result.maxYield, moves };
};

// Recursive Solver to find the theoretical minimum score
export const findWorstScore = (startList: CardItem[], availableTools?: ToolInstance[]): number => {
  // If no tools provided, default to standard set (legacy support or fallback)
  const defaultTools: ToolType[] = ['swap', 'promote', 'demote'];
  const toolsToUse = availableTools ? availableTools.filter(t => !t.used).map(t => t.type) : defaultTools;

  const solution = findWorstSolution(startList, toolsToUse);
  return solution.score;
};

// Recursive Solver to find the worst solution (score + path)
export const findWorstSolution = (startList: CardItem[], availableTools: ToolType[]): Solution => {
  // Convert to SolverItem for potentially rich state
  const initialNums: SolverItem[] = startList.map(item => ({ val: item.val, hasShield: item.hasShield }));

  // Use the unified solver core with MIN objective
  const result = solve(initialNums, availableTools, 'MIN');

  // Map moves
  const moves: Move[] = result.bestSolution.map(m => ({
    tool: m.tool as ToolType,
    index: m.i,
    targetIndex: m.t,
    description: ''
  }));

  return { score: result.maxYield, moves };
};

export const calculateRelativeEfficiency = (userScore: number, optimal: number, worst: number): number => {
  if (optimal === worst) return 100;
  const efficiency = ((userScore - worst) / (optimal - worst)) * 100;
  return Math.max(0, Math.min(100, Math.round(efficiency)));
};



export interface MoveResult<T> {
  newList: T[];
  impactedIndices: number[];
}

// Apply a move to a list and return the new list and impacted indices
export function applyMove<T extends ISortable>(list: T[], tool: ToolType, index: number, selection?: number | null): MoveResult<T> {
  const strategy = TOOL_REGISTRY[tool];
  if (strategy) {
    const newList = strategy.apply(list, index, selection !== null ? selection : undefined) as T[];
    let impactedIndices: number[] = [];

    // Determine impacted indices based on tool type
    if (tool === 'transfer') {
      impactedIndices = [index];
      if (selection !== undefined && selection !== null) {
        impactedIndices.push(selection);
      }
    } else if (tool === 'swap') {
      impactedIndices = [index];
      if (selection !== undefined && selection !== null) {
        impactedIndices.push(selection);
      }
    } else {
      // Default single-index action (promote, demote, etc.)
      impactedIndices = [index];
    }

    return { newList, impactedIndices };
  }
  return { newList: list, impactedIndices: [] };
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
      hiddenRole: HiddenRole.NONE,
      delta: 0,
      userTag: UserTag.NONE
    };
  });
};


export const generateFlavorMap = (seed?: number): Record<FlavorKey, string> => {
  // ... existing flavor map logic (omitted in tool, but I can't restart function half way) ...
  // Actually, I can use separate chunks.
  const random = seed !== undefined ? mulberry32(seed + 777) : Math.random; // Offset seed
  const keys: FlavorKey[] = ["SOLVED", "DONE", "ADEQUATE", "INITIAL", "SUSPICIOUS", "SABOTAGE"];
  const map = {} as Record<FlavorKey, string>;

  keys.forEach(key => {
    const options = FLAVOR_DATABASE[key];
    if (!options) return; // Safety check in case of mismatch

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

/**
 * Calculates both visible yield and true yield based on survivors.
 * Yield = sum of visible values (val) of all survivors
 * True Yield = sum of hidden values (trueValue) of all survivors
 * This is different from game "score" which excludes the first item.
 */
export const calculateYields = (items: CardItem[]): { visibleYield: number; trueYield: number } => {
  if (!items || items.length === 0) return { visibleYield: 0, trueYield: 0 };

  // Grade the list to determine survivors based on sorting rules
  const { gradedList } = gradeLevel(items);

  let visibleYield = 0;
  let trueYield = 0;

  for (let i = 0; i < gradedList.length; i++) {
    if (gradedList[i].status === 'safe') {
      visibleYield += gradedList[i].val;
      trueYield += gradedList[i].val + (gradedList[i].delta || 0);
    }
  }

  return { visibleYield, trueYield };
};

// Legacy wrapper for backward compatibility
export const calculateTrueYield = (items: CardItem[], targetLength: number): number => {
  return calculateYields(items).trueYield;
};


export const verifyResistanceMission = (
  items: CardItem[],
  currentStatus: ResistanceStatus,
  targetLength: number,
  initialTrueYield: number,
  maxTrueYield: number
): ResistanceStatus => {
  // 1. If already MIA, game over.
  if (currentStatus === ResistanceStatus.MIA) {
    return ResistanceStatus.MIA;
  }

  // 2. Iterate through items to check Roles
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    // Keep Zone: Indices 0 to targetLength-1, provided they are NOT eliminated.
    // Reject Zone: Indices >= targetLength OR any Eliminated item.
    const isKept = i < targetLength && item.status !== 'eliminated';

    if (isKept) {
      // KEEP ZONE Logic
      // If we Keep a STATE agent -> COMPROMISED
      if (item.hiddenRole === HiddenRole.STATE) {
        return ResistanceStatus.COMPROMISED;
      }
    } else {
      // REJECT ZONE Logic
      // If we Reject (or Eliminate) a RESISTANCE agent -> MIA
      if (item.hiddenRole === HiddenRole.RESISTANCE) {
        return ResistanceStatus.MIA;
      }
    }
  }

  // 3. Logic based on True Yield (No Failures)
  const { trueYield } = calculateYields(items);

  if (trueYield >= maxTrueYield) {
    return ResistanceStatus.SUCCESS;
  } else if (trueYield > initialTrueYield) {
    return ResistanceStatus.CAREFUL;
  } else {
    // If yield is at initial or below
    return ResistanceStatus.EXPOSED;
  }
};
