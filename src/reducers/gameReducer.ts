import { GameState, GameAction } from './gameState';
import { GamePhase, ToolInstance, Move, ToolType, ResistanceStatus } from '../../types';
import { applyMove } from '../utils/gameLogic';

export const initialState: GameState = {
  level: 1,
  levelScore: 0,
  totalScore: 0,
  totalOptimalScore: 0,
  optimalScore: null,
  worstScore: null,
  list: [],
  initialList: [],
  movesHistory: [],
  phase: GamePhase.PLANNING,
  toolsAvailable: [],
  detectedMode: null,
  selection: null,
  selectedToolInstanceId: null,
  shakeTools: 0,
  dailyCompleted: false,
  currentSeed: undefined,
  resistanceStatus: ResistanceStatus.ACTIVE,
};

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'INITIALIZE_GAME': {
      return {
        ...initialState,
        ...action.payload.state,
      };
    }

    case 'START_LEVEL': {
      return {
        ...state,
        level: action.payload.level,
        list: action.payload.list,
        initialList: action.payload.initialList ? [...action.payload.initialList] : [...action.payload.list],
        toolsAvailable: action.payload.tools,
        currentSeed: action.payload.seed,
        optimalScore: action.payload.optimalScore ?? null,
        worstScore: action.payload.worstScore ?? null,
        movesHistory: action.payload.movesHistory || [],
        phase: GamePhase.PLANNING,
        levelScore: 0,
        detectedMode: null,
        selectedToolInstanceId: null,
        selection: null,
        flavorMap: action.payload.flavorMap,
      };
    }

    case 'SELECT_TOOL': {
      if (state.phase !== GamePhase.PLANNING) return state;
      const { toolInstanceId } = action.payload;
      return {
        ...state,
        selectedToolInstanceId: toolInstanceId,
        // Optional: clear selection? Keeping valid state is safer.
      };
    }

    case 'SELECT_TILE': {
      if (state.phase !== GamePhase.PLANNING) return state;
      return {
        ...state,
        selection: action.payload.index
      };
    }

    case 'APPLY_MOVE': {
      if (state.phase !== GamePhase.PLANNING) return state;
      const { list, move } = action.payload;

      // Mark tool as used
      const newTools = state.toolsAvailable.map(t =>
        t.instanceId === move.toolInstanceId ? { ...t, used: true } : t
      );

      return {
        ...state,
        list,
        toolsAvailable: newTools,
        movesHistory: [...state.movesHistory, move],
        selection: null,
        selectedToolInstanceId: null,
      };
    }

    case 'CANCEL_SELECTION': {
      return {
        ...state,
        selectedToolInstanceId: null,
        selection: null
      };
    }

    case 'INSPECTION_STEP': {
      const { list, scoreDelta, detectedMode } = action.payload;
      return {
        ...state,
        list: list,
        levelScore: state.levelScore + scoreDelta,
        detectedMode: detectedMode ?? state.detectedMode,
      };
    }

    case 'TRIGGER_INVALID_MOVE': {
      return { ...state, shakeTools: state.shakeTools + 1 };
    }

    case 'RESET_STATS': {
      return { ...state, totalScore: 0, totalOptimalScore: 0 };
    }

    case 'SET_PHASE': {
      return { ...state, phase: action.payload.phase };
    }

    case 'SET_DAILY_COMPLETED': {
      return { ...state, dailyCompleted: action.payload.completed };
    }

    case 'SET_TOTAL_SCORE': {
      return { ...state, totalScore: action.payload.score };
    }

    case 'SET_TOTAL_OPTIMAL_SCORE': {
      return { ...state, totalOptimalScore: action.payload.score };
    }

    case 'SET_OPTIMAL_SCORE': {
      return { ...state, optimalScore: action.payload.score };
    }

    case 'SET_WORST_SCORE': {
      return { ...state, worstScore: action.payload.score };
    }

    case 'SET_LIST': {
      return { ...state, list: action.payload.list };
    }

    case 'SET_DETECTED_MODE': {
      return { ...state, detectedMode: action.payload.mode };
    }

    case 'SET_LEVEL_SCORE': {
      return { ...state, levelScore: action.payload.score };
    }

    case 'UNDO_MOVE': {
      if (state.movesHistory.length === 0) return state;

      const newHistory = state.movesHistory.slice(0, -1);

      // Replay Logic
      let currentList = state.initialList.map(item => ({ ...item })); // Deepish copy
      const currentTools = state.toolsAvailable.map(t => ({ ...t, used: false }));

      newHistory.forEach(move => {
        // Apply move logic
        currentList = applyMove(currentList, move.tool, move.index, move.targetIndex);

        // Mark tool as used
        const toolIdx = currentTools.findIndex(t => t.instanceId === move.toolInstanceId);
        if (toolIdx !== -1) {
          currentTools[toolIdx].used = true;
        }
      });

      return {
        ...state,
        list: currentList,
        toolsAvailable: currentTools,
        movesHistory: newHistory,
        selection: null,
        selectedToolInstanceId: null
      };
    }

    default:
      return state;
  }
};
