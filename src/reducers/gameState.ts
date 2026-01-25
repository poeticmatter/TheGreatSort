import { CardItem, GamePhase, ToolInstance, Move, ToolType } from '../../types';

export interface GameState {
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
  
  // Added for granular inspection/grading state if needed, though mostly covered by 'list' updates
}

export type GameAction =
  | { 
      type: 'START_LEVEL'; 
      payload: { 
        level: number; 
        list: CardItem[]; 
        tools: ToolInstance[]; 
        seed?: number; 
        optimalScore?: number;
        worstScore?: number;
      } 
    }
  | { type: 'SELECT_CARD'; payload: { index: number } }
  | { type: 'SELECT_TOOL'; payload: { toolInstanceId: string } }
  | { type: 'DESELECT_TOOL' }
  | { 
      type: 'COMMIT_MOVE'; 
      payload: { 
        toolInstanceId: string; 
        toolType: ToolType;
        targetIndex: number; 
        selectionIndex?: number | null; 
        description: string;
      } 
    }
  | { 
      type: 'INSPECTION_STEP'; 
      payload: { 
        list: CardItem[]; 
        scoreDelta: number; 
        detectedMode?: 'ASC' | 'DESC' | null;
      } 
    }
  | { type: 'TRIGGER_INVALID_MOVE'; payload: { shake: boolean } } // Using shake to just imply invalid feedback
  | { type: 'RESET_STATS' }
  | { type: 'SET_PHASE'; payload: { phase: GamePhase } }
  | { type: 'SET_DAILY_COMPLETED'; payload: { completed: boolean } };
