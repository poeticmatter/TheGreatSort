import { CardItem, GamePhase, ToolInstance, Move, ResistanceStatus } from '../../types';
import { FlavorKey } from '../config/flavorText';

export interface GameState {
  level: number;
  levelScore: number;
  totalScore: number;
  totalOptimalScore: number;
  optimalScore: number | null;
  worstScore: number | null;
  list: CardItem[];
  initialList: CardItem[];
  movesHistory: Move[];
  phase: GamePhase;
  toolsAvailable: ToolInstance[];
  detectedMode: 'ASC' | 'DESC' | null;
  selection: number | null;
  selectedToolInstanceId: string | null;
  shakeTools: number;
  dailyCompleted: boolean;
  currentSeed: number | undefined;
  flavorMap?: Record<FlavorKey, string>;
  resistanceStatus: ResistanceStatus;
}

export type GameAction =
  | {
    type: 'INITIALIZE_GAME';
    payload: {
      state: Partial<GameState>;
    }
  }
  | {
    type: 'START_LEVEL';
    payload: {
      level: number;
      list: CardItem[];
      tools: ToolInstance[];
      seed?: number;
      optimalScore?: number;
      worstScore?: number;
      movesHistory?: Move[];
      flavorMap?: Record<FlavorKey, string>;
      initialList?: CardItem[];
    }
  }
  | { type: 'SELECT_TOOL'; payload: { toolInstanceId: string | null } }
  | { type: 'SELECT_TILE'; payload: { index: number } }
  | { type: 'APPLY_MOVE'; payload: { list: CardItem[]; move: Move } }
  | { type: 'CANCEL_SELECTION' }
  | {
    type: 'INSPECTION_STEP';
    payload: {
      list: CardItem[];
      scoreDelta: number;
      detectedMode?: 'ASC' | 'DESC' | null;
    }
  }
  | { type: 'TRIGGER_INVALID_MOVE'; payload: { shake: boolean } }
  | { type: 'RESET_STATS' }
  | { type: 'SET_PHASE'; payload: { phase: GamePhase } }
  | { type: 'SET_DAILY_COMPLETED'; payload: { completed: boolean } }
  | { type: 'SET_TOTAL_SCORE'; payload: { score: number } }
  | { type: 'SET_TOTAL_OPTIMAL_SCORE'; payload: { score: number } }
  | { type: 'SET_OPTIMAL_SCORE'; payload: { score: number } }
  | { type: 'SET_WORST_SCORE'; payload: { score: number } }
  | { type: 'SET_LIST'; payload: { list: CardItem[] } }
  | { type: 'SET_DETECTED_MODE'; payload: { mode: 'ASC' | 'DESC' | null } }
  | { type: 'SET_LEVEL_SCORE'; payload: { score: number } }
  | { type: 'SET_LEVEL_SCORE'; payload: { score: number } }
  | { type: 'UNDO_MOVE' }
  | { type: 'TOGGLE_TAG'; payload: { index: number } }
  | { type: 'ACTIVATE_RESISTANCE' };
