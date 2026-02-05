import { CardItem, ToolType, GamePhase, ToolInstance, ISortable, Move, AgentRole, ResistanceStatus } from '../../types';
import { ALL_TOOL_TYPES, TOOL_META } from '../toolDefinitions';
import { TOOL_REGISTRY } from '../tools';
import { FLAVOR_DATABASE, FlavorKey } from '../config/flavorText';
import { calculateBatchScore, judgeStep, solve, DailyPuzzleMove, SolverItem } from './solverCore';

export { calculateBatchScore, judgeStep };

export const calculateCompliance = (
  currentYield: number,
  optimalYield: number | null,
  worstYield: number | null
): number => {
  let compliancePercentage = 0;

  if (optimalYield !== null && worstYield !== null && optimalYield > worstYield) {
    const range = optimalYield - worstYield;
    const currentProgress = currentYield - worstYield;
    compliancePercentage = Math.round((currentProgress / range) * 100);
  } else if (optimalYield && optimalYield > 0) {
    // Fallback
    compliancePercentage = Math.round((currentYield / optimalYield) * 100);
  }

  // Cap visually
  return Math.min(100, Math.max(0, compliancePercentage));
};



export interface ResistanceTriggerContext {
  gameMode: string;
  resistanceActive: boolean;
  scoresCalculated: boolean;
  compliancePercentage: number;
  currentYield: number;
  worstScore: number | null;
  listLength: number;
  hasJoined: boolean;
  movesCount: number;
  hasTriggeredLocal: boolean;
}

export const shouldTriggerResistance = (context: ResistanceTriggerContext): boolean => {
  // Trigger when player hits the exact minimum yield (Failure State)
  // Scores must be calculated and match the worst possible score.
  return (
    context.gameMode === 'DAILY' &&
    context.scoresCalculated &&
    context.worstScore !== null &&
    context.currentYield <= context.worstScore && // Integer comparison
    !context.resistanceActive &&
    context.listLength > 0 &&
    !context.hasJoined &&
    context.movesCount > 0 &&
    !context.hasTriggeredLocal
  );
};

// --- Selector: Derives ResistanceTriggerContext from state ---
export interface ResistanceTriggerStateInput {
  list: CardItem[];
  optimalScore: number | null;
  worstScore: number | null;
  movesHistory: Move[];
  resistance: {
    isViewOpen: boolean;
    hasTriggered: boolean;
    status: ResistanceStatus;
  };
}

export const selectResistanceTriggerContext = (
  coreState: ResistanceTriggerStateInput,
  gameMode: string,
  hasJoined: boolean
): ResistanceTriggerContext => {
  const { score: currentYield } = gradeLevel(coreState.list);
  const compliancePercentage = calculateCompliance(
    currentYield,
    coreState.optimalScore,
    coreState.worstScore
  );
  const scoresCalculated = coreState.optimalScore !== null && coreState.worstScore !== null;
  const resistanceActive =
    coreState.resistance.isViewOpen ||
    coreState.resistance.status !== ResistanceStatus.INACTIVE;

  return {
    gameMode,
    resistanceActive,
    scoresCalculated,
    compliancePercentage,
    currentYield,
    worstScore: coreState.worstScore,
    listLength: coreState.list.length,
    hasJoined,
    movesCount: coreState.movesHistory.length,
    hasTriggeredLocal: coreState.resistance.hasTriggered,
  };
};

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
export const findOptimalSolution = (startList: CardItem[], availableTools: ToolType[]): Solution => {
  const initialNums: SolverItem[] = startList.map(item => ({ val: item.val, hasShield: item.hasShield }));

  const result = solve(initialNums, availableTools);

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
  const defaultTools: ToolType[] = ['swap', 'promote', 'demote'];
  const toolsToUse = availableTools ? availableTools.filter(t => !t.used).map(t => t.type) : defaultTools;

  const solution = findWorstSolution(startList, toolsToUse);
  return solution.score;
};

// Recursive Solver to find the worst solution (score + path)
export const findWorstSolution = (startList: CardItem[], availableTools: ToolType[]): Solution => {
  const initialNums: SolverItem[] = startList.map(item => ({ val: item.val, hasShield: item.hasShield }));

  const result = solve(initialNums, availableTools, 'MIN');

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
  const random = seed !== undefined ? mulberry32(seed + 9999) : Math.random;
  const tools: ToolInstance[] = [];

  const totalWeight = ALL_TOOL_TYPES.reduce((sum, toolId) => {
    const def = TOOL_META[toolId.toUpperCase()];
    return sum + (def ? def.weight : 0);
  }, 0);

  for (let i = 0; i < 4; i++) {
    let threshold = random() * totalWeight;
    let selectedType: ToolType = ALL_TOOL_TYPES[0] as ToolType;

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
  const random = seed !== undefined ? mulberry32(seed) : Math.random;

  const maxVal = length * 2;
  const pool = Array.from({ length: maxVal }, (_, i) => i + 1);

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const numbers = pool.slice(0, length);

  return numbers.map(val => {
    const idSuffix = seed !== undefined
      ? Math.floor(random() * 1000000).toString(36)
      : Math.random().toString(36).substring(2, 9);

    return {
      id: idSuffix,
      val: val,
      status: 'pending',
      role: AgentRole.NONE,
      // delta removed
      // userTag removed
    };
  });
};


export const generateFlavorMap = (seed?: number): Record<FlavorKey, string> => {
  const random = seed !== undefined ? mulberry32(seed + 777) : Math.random;
  const keys: FlavorKey[] = ["SOLVED", "DONE", "ADEQUATE", "INITIAL", "SUSPICIOUS", "SABOTAGE"];
  const map = {} as Record<FlavorKey, string>;

  keys.forEach(key => {
    const options = FLAVOR_DATABASE[key];
    if (!options) return;

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

// Deprecated logic removed.

export const verifyResistanceMission = (
  items: CardItem[],
  currentStatus: ResistanceStatus,
  targetLength: number,
  initialYield: number,
  targetYield: number // The Conditional Maximum Yield
): ResistanceStatus => {
  // If already ended irrecoverably (e.g. MIA), preserve it?
  // Actually, standard logic is to re-evaluate on every inspection fully.
  // Except if we have a persisted failure state that shouldn't be cleared?
  // Let's assume re-evaluation is fine because inspection is transient until final result.

  // 1. Determine Survivors
  // We assume 'items' passed here are already GRADED (have status 'safe' or 'eliminated').
  // If not, we should grade them. But usually this is called with the result of gradeLevel or current game state.
  // To be safe, let's recalculate grade if status is pending, but usually this is called in RESULTS phase or during check.
  // Actually, usually we verify based on the FINAL state.

  let visibleYield = 0;
  let resistanceSurvived = true; // Start true, check if any faltered
  let stateEliminated = true; // Start true, check if any survived
  let hasResistance = false;
  let hasState = false;

  for (const item of items) {
    if (item.status === 'safe') {
      visibleYield += item.val;
      if (item.role === AgentRole.RESISTANCE) {
        hasResistance = true;
        // Good
      }
      if (item.role === AgentRole.STATE) {
        hasState = true;
        stateEliminated = false; // Fail: State agent survived
      }
    } else if (item.status === 'eliminated') {
      if (item.role === AgentRole.RESISTANCE) {
        hasResistance = true;
        resistanceSurvived = false; // Fail: Resistance agent eliminated
      }
      if (item.role === AgentRole.STATE) {
        hasState = true;
        // Good
      }
    } else {
      // If pending/scanning, we can't judge yet. Return INACTIVE or currentStatus?
      // Usually verifyResistanceMission is called at the end.
    }
  }

  // If no agents are present (not resistance mode), return INACTIVE
  if (!hasResistance && !hasState) return ResistanceStatus.INACTIVE;

  // Check Fail Conditions
  if (!resistanceSurvived) {
    return ResistanceStatus.EXPOSED; // Resistance Agent died
  }

  if (!stateEliminated) {
    return ResistanceStatus.COMPROMISED; // State Agent survived
  }

  // Check Success Condition
  // If we are here, means Resistance Clean and State Gone.
  if (visibleYield >= targetYield) {
    return ResistanceStatus.SUCCESS;
  } else {
    return ResistanceStatus.CAREFUL; // Logic: Survived but yield too low
  }
};
