import { GameState, GameAction } from './gameState';
import { GamePhase, ToolInstance, Move } from '../../types';
import { applyMove } from '../utils/gameLogic';

export const initialState: GameState = {
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

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'START_LEVEL': {
      return {
        ...state,
        level: action.payload.level,
        list: action.payload.list,
        toolsAvailable: action.payload.tools,
        currentSeed: action.payload.seed,
        optimalScore: action.payload.optimalScore ?? null,
        worstScore: action.payload.worstScore ?? null,
        // Reset Level State
        movesHistory: [],
        phase: GamePhase.PLANNING,
        levelScore: 0,
        detectedMode: null,
        selectedToolInstanceId: null,
        selection: null,
      };
    }

    case 'SELECT_CARD': {
      const { index } = action.payload;
      if (state.phase !== GamePhase.PLANNING) return state;

      // Toggle behavior
      if (state.selection === index) {
        return {
          ...state,
          selection: null, // Deselect
        };
      }
      return {
        ...state,
        selection: index,
      };
    }

    case 'SELECT_TOOL': {
      const { toolInstanceId } = action.payload;
      if (state.phase !== GamePhase.PLANNING) return state;

      const tool = state.toolsAvailable.find(t => t.instanceId === toolInstanceId);
      if (!tool || tool.used) return state;

      // Toggle behavior if already selected
      if (state.selectedToolInstanceId === toolInstanceId) {
        return {
          ...state,
          selectedToolInstanceId: null,
          selection: null, 
        };
      }

      return {
        ...state,
        selectedToolInstanceId: toolInstanceId,
         // Note: We don't necessarily clear selection here, 
         // as some interactoins might be Select Card -> Select Tool -> Execute
      };
    }
    
    case 'DESELECT_TOOL': {
      return {
        ...state,
        selectedToolInstanceId: null,
        selection: null
      };
    }

    case 'COMMIT_MOVE': {
      const { toolInstanceId, toolType, targetIndex, selectionIndex, description } = action.payload;
      
      // Calculate new list state
      const newList = applyMove(state.list, toolType, targetIndex, selectionIndex);
      
      // Mark tool as used
      const newTools = state.toolsAvailable.map(t => 
        t.instanceId === toolInstanceId ? { ...t, used: true } : t
      );
      
      const newMove: Move = {
        tool: toolType,
        index: targetIndex,
        targetIndex: selectionIndex ?? undefined,
        description
      };

      return {
        ...state,
        list: newList,
        toolsAvailable: newTools,
        movesHistory: [...state.movesHistory, newMove],
        // Reset selection state
        selection: null,
        selectedToolInstanceId: null,
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
      return {
        ...state,
        shakeTools: state.shakeTools + 1,
        // Optionally clear selection if desired, but usually we just shake
      };
    }

    case 'RESET_STATS': {
      return {
        ...state,
        totalScore: 0,
        totalOptimalScore: 0,
      };
    }

    case 'SET_PHASE': {
      return {
        ...state,
        phase: action.payload.phase,
      };
    }

    case 'SET_DAILY_COMPLETED': {
      return {
        ...state,
        dailyCompleted: action.payload.completed,
      };
    }

    default:
      return state;
  }
};
