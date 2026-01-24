import { CardItem, GamePhase, ToolInstance, Move } from '../../types';

export interface EngineState {
  level: number;
  levelScore: number;
  totalScore: number;
  totalOptimalScore: number;
  optimalScore: number | null;
  worstScore: number | null;
  list: CardItem[];
  movesHistory: Move[];
  phase: GamePhase;
  toolsAvailable: ToolInstance[];
  detectedMode: 'ASC' | 'DESC' | null;
  selection: number | null;
  selectedToolInstanceId: string | null;
  shakeTools: number;
  dailyCompleted: boolean;
  currentSeed: number | undefined;
}

export const initialEngineState: EngineState = {
  level: 1,
  levelScore: 0,
  totalScore: 0,
  totalOptimalScore: 0,
  optimalScore: null,
  worstScore: null,
  list: [],
  movesHistory: [],
  phase: GamePhase.PLANNING,
  toolsAvailable: [],
  detectedMode: null,
  selection: null,
  selectedToolInstanceId: null,
  shakeTools: 0,
  dailyCompleted: false,
  currentSeed: undefined,
};

export type GameAction =
  | { type: 'START_LEVEL'; payload: { level: number; list: CardItem[]; tools: ToolInstance[]; seed?: number } }
  | { type: 'COMMIT_MOVE'; payload: { newList: CardItem[]; toolInstanceId: string; move: Move } }
  | { type: 'SET_SELECTION'; payload: { selection?: number | null; toolId?: string | null } }
  | { type: 'TRIGGER_SHAKE' }
  | { type: 'SET_PHASE'; payload: GamePhase }
  | { type: 'SET_LIST'; payload: CardItem[] }
  | { type: 'LOAD_STATE'; payload: Partial<EngineState> }
  | { type: 'SET_SCORES'; payload: Partial<Pick<EngineState, 'levelScore' | 'totalScore' | 'totalOptimalScore' | 'optimalScore' | 'worstScore'>> }
  | { type: 'SET_DETECTED_MODE'; payload: 'ASC' | 'DESC' | null }
  | { type: 'SET_DAILY_COMPLETED'; payload: boolean };

export const gameReducer = (state: EngineState, action: GameAction): EngineState => {
  switch (action.type) {
    case 'START_LEVEL':
      return {
        ...state,
        level: action.payload.level,
        list: action.payload.list,
        toolsAvailable: action.payload.tools,
        currentSeed: action.payload.seed,
        movesHistory: [],
        phase: GamePhase.PLANNING,
        levelScore: 0,
        optimalScore: null,
        worstScore: null,
        detectedMode: null,
        selectedToolInstanceId: null,
        selection: null,
      };
    case 'COMMIT_MOVE':
      return {
        ...state,
        list: action.payload.newList,
        toolsAvailable: state.toolsAvailable.map(t =>
          t.instanceId === action.payload.toolInstanceId ? { ...t, used: true } : t
        ),
        movesHistory: [...state.movesHistory, action.payload.move],
        selectedToolInstanceId: null,
        selection: null,
      };
    case 'SET_SELECTION':
      return {
        ...state,
        selection: action.payload.selection !== undefined ? action.payload.selection : state.selection,
        selectedToolInstanceId: action.payload.toolId !== undefined ? action.payload.toolId : state.selectedToolInstanceId,
      };
    case 'TRIGGER_SHAKE':
      return {
        ...state,
        shakeTools: state.shakeTools + 1,
      };
    case 'SET_PHASE':
      return { ...state, phase: action.payload };
    case 'SET_LIST':
      return { ...state, list: action.payload };
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    case 'SET_SCORES':
      return { ...state, ...action.payload };
    case 'SET_DETECTED_MODE':
      return { ...state, detectedMode: action.payload };
    case 'SET_DAILY_COMPLETED':
      return { ...state, dailyCompleted: action.payload };
    default:
      return state;
  }
};
