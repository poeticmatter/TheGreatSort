import { CardItem, GamePhase, ToolInstance, Move, AgentRole, ResistanceStatus } from '../../types.ts';
import { FLAVOR_DATABASE, FlavorKey } from '../config/flavorText.ts';
import { createSeededRandom, gradeLevel } from '../engine/index.ts';

// Keeps the flavor stream independent of the sequence stream for the same seed.
const FLAVOR_SEED_OFFSET = 777;

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
    context.movesCount > 0
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
  };
};

export interface DailyState {
  date: string;
  moves: Move[];
  phase: GamePhase;
  tools: ToolInstance[];
}

export const calculateRelativeEfficiency = (userScore: number, optimal: number, worst: number): number => {
  if (optimal === worst) return 100;
  const efficiency = ((userScore - worst) / (optimal - worst)) * 100;
  return Math.max(0, Math.min(100, Math.round(efficiency)));
};



export const generateFlavorMap = (seed?: number): Record<FlavorKey, string> => {
  const random = seed !== undefined ? createSeededRandom(seed + FLAVOR_SEED_OFFSET) : Math.random;
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

export const verifyResistanceMission = (
  items: CardItem[],
  currentStatus: ResistanceStatus,
  targetLength: number,
  initialYield: number,
  targetYield: number // The Conditional Maximum Yield
): ResistanceStatus => {
  // If already ended irrecoverably, preserve it?
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
