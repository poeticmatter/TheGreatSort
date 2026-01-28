import { GameState, GameAction } from './gameState';
import { GamePhase, ToolInstance, Move, ToolType } from '../../types';
import { applyMove, calculateBatchScore } from '../utils/gameLogic';
import { TOOL_REGISTRY } from '../tools';

export const initialState: GameState = {
  level: 1,
  levelScore: 0,
  totalScore: 0,
  totalOptimalScore: 0,
  optimalScore: null,
  worstScore: null,
  initialScore: null,
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
};

// Helper to execute a valid move
const executeMove = (
  state: GameState, 
  toolInstanceId: string, 
  toolType: ToolType, 
  targetIndex: number, 
  selectionIndex?: number | null
): GameState => {
  const newList = applyMove(state.list, toolType, targetIndex, selectionIndex);

  const newTools = state.toolsAvailable.map(t => 
      t.instanceId === toolInstanceId ? { ...t, used: true } : t
  );

  const description = selectionIndex !== undefined && selectionIndex !== null
       ? `${toolType} ${selectionIndex} and ${targetIndex}` 
       : `${toolType} at ${targetIndex}`;

  const newMove: Move = {
      tool: toolType,
      toolInstanceId: toolInstanceId,
      index: targetIndex,
      targetIndex: selectionIndex ?? undefined,
      description
  };

  return {
    ...state,
    list: newList,
    toolsAvailable: newTools,
    movesHistory: [...state.movesHistory, newMove],
    selection: null,
    selectedToolInstanceId: null,
  };
};

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'START_LEVEL': {
      return {
        ...state,
        level: action.payload.level,
        list: action.payload.list,
        initialList: [...action.payload.list],
        initialScore: calculateBatchScore(action.payload.list),
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
      };
    }

    case 'INTERACT_TOOL': {
      if (state.phase !== GamePhase.PLANNING) return state;
      const { toolInstanceId } = action.payload;
      
      const toolInstance = state.toolsAvailable.find(t => t.instanceId === toolInstanceId);
      if (!toolInstance || toolInstance.used) return state;

      // 1. If same tool selected -> Deselect
      if (state.selectedToolInstanceId === toolInstanceId) {
        return {
          ...state,
          selectedToolInstanceId: null,
          selection: null,
        };
      }

      // 2. Switching to new tool
      const strategy = TOOL_REGISTRY[toolInstance.type];
      if (!strategy) return state;

      // 3. Immediate Execution Check
      // If a card is already selected, and we click a ONE-STEP tool (requiresSelection=false),
      // does the user imply "Use this tool on the currently selected card"?
      // The prompt says: "If a card was selected and the new tool is an 'Immediate Action' ... execute"
      if (state.selection !== null && !strategy.requiresSelection) {
         if (strategy.isValid(state.list, state.selection)) {
             return executeMove(state, toolInstanceId, toolInstance.type, state.selection);
         } else {
             // Invalid move, shake but select tool? Or just shake?
             // Fallback: Just select the tool.
             return {
                 ...state,
                 selectedToolInstanceId: toolInstanceId
             };
         }
      }

      // 4. Default: Select the tool
      return {
        ...state,
        selectedToolInstanceId: toolInstanceId,
        // Keep existing card selection if any, as 2-step tools might use it
      };
    }

    case 'INTERACT_TILE': {
      if (state.phase !== GamePhase.PLANNING) return state;
      const { index } = action.payload;

      // Strict Tool-First Requirement
      if (!state.selectedToolInstanceId) {
          return state;
      }


      // Case B: Tool Selected -> Attempt Move
      const toolInstance = state.toolsAvailable.find(t => t.instanceId === state.selectedToolInstanceId);
      if (!toolInstance || toolInstance.used) return { ...state, selectedToolInstanceId: null };
      
      const strategy = TOOL_REGISTRY[toolInstance.type];
      
      // B.1 One-Step Tool (Clicking card executes it)
      if (!strategy.requiresSelection) {
          if (strategy.isValid(state.list, index)) {
              return executeMove(state, toolInstance.instanceId, toolInstance.type, index);
          } else {
              return { ...state, shakeTools: state.shakeTools + 1 };
          }
      }

      // B.2 Two-Step Tool (Requires Selection)
      // If nothing selected yet, select this as the "first" card
      if (state.selection === null) {
          return { ...state, selection: index };
      }

      // If we have a selection, this click is the "target" (second click)
      // Note: state.selection is NOT guaranteed to be the 'index' arg unless user clicked same card
      if (strategy.isValid(state.list, index, state.selection)) {
           return executeMove(state, toolInstance.instanceId, toolInstance.type, index, state.selection);
      } else {
           // Invalid (e.g. non-adjacent for swap, or same card)
           // If clicked same card, deselect? Or jsut shake?
           // Prompt says: "If false, shakeTools."
           return { ...state, shakeTools: state.shakeTools + 1 };
      }
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
