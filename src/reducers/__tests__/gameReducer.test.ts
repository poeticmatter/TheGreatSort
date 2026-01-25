import { describe, it, expect } from 'vitest';
import { gameReducer, initialState } from '../gameReducer';
import { GameAction } from '../gameState';
import { GamePhase, ToolInstance, CardItem } from '../../../types';

describe('gameReducer', () => {

  it('should return initial state', () => {
    // @ts-ignore - passing empty action to test default param/case
    const state = gameReducer(initialState, {} as GameAction);
    expect(state).toEqual(initialState);
  });

  it('should handle START_LEVEL', () => {
    const mockList: CardItem[] = [
      { id: '1', val: 10, status: 'pending', linkScore: null }
    ];
    const mockTools: ToolInstance[] = [
      { instanceId: 't1', type: 'swap', used: false }
    ];

    const action: GameAction = {
      type: 'START_LEVEL',
      payload: {
        level: 1,
        list: mockList,
        tools: mockTools,
        seed: 12345
      }
    };

    const newState = gameReducer(initialState, action);

    expect(newState.level).toBe(1);
    expect(newState.list).toEqual(mockList);
    expect(newState.toolsAvailable).toEqual(mockTools);
    expect(newState.currentSeed).toBe(12345);
    expect(newState.phase).toBe(GamePhase.PLANNING);
  });

  describe('SELECT_CARD', () => {
    it('should select a card if none selected', () => {
      const state = { ...initialState, phase: GamePhase.PLANNING };
      const action: GameAction = {
        type: 'SELECT_CARD',
        payload: { index: 2 }
      };
      const result = gameReducer(state, action);
      expect(result.selection).toBe(2);
    });

    it('should deselect if same card clicked (toggle)', () => {
      const state = { ...initialState, phase: GamePhase.PLANNING, selection: 2 };
      const action: GameAction = {
        type: 'SELECT_CARD',
        payload: { index: 2 }
      };
      const result = gameReducer(state, action);
      expect(result.selection).toBeNull();
    });

    it('should switch selection to new card', () => {
      const state = { ...initialState, phase: GamePhase.PLANNING, selection: 2 };
      const action: GameAction = {
        type: 'SELECT_CARD',
        payload: { index: 5 }
      };
      const result = gameReducer(state, action);
      expect(result.selection).toBe(5);
    });
  });

  describe('COMMIT_MOVE', () => {
    // Setup a scenario
    const startingList: CardItem[] = [
      { id: 'a', val: 10, status: 'pending', linkScore: null },
      { id: 'b', val: 5, status: 'pending', linkScore: null }
    ];
    const startingTools: ToolInstance[] = [
      { instanceId: 'tool-swap-1', type: 'swap', used: false }
    ];
    
    const readyState = {
      ...initialState,
      list: startingList,
      toolsAvailable: startingTools,
      selectedToolInstanceId: 'tool-swap-1',
      selection: 0
    };

    it('should apply move, mark tool used, and reset selection', () => {
      // We expect 'swap' to swap index 0 and 1
      const action: GameAction = {
        type: 'COMMIT_MOVE',
        payload: {
          toolInstanceId: 'tool-swap-1',
          toolType: 'swap',
          targetIndex: 1,
          selectionIndex: 0,
          description: 'Swap 0 and 1'
        }
      };

      const newState = gameReducer(readyState, action);

      // Verify List Mutation (Swap happened)
      expect(newState.list[0].val).toBe(5);
      expect(newState.list[1].val).toBe(10);

      // Verify Tool Consumption
      const usedTool = newState.toolsAvailable.find(t => t.instanceId === 'tool-swap-1');
      expect(usedTool?.used).toBe(true);

      // Verify History
      expect(newState.movesHistory).toHaveLength(1);
      expect(newState.movesHistory[0].description).toBe('Swap 0 and 1');

      // Verify Reset
      expect(newState.selection).toBeNull();
      expect(newState.selectedToolInstanceId).toBeNull();
    });
  });

  describe('INSPECTION_STEP', () => {
    it('should accumulate score and update list', () => {
        const state = { 
            ...initialState, 
            levelScore: 100 
        };

        const newList: CardItem[] = [
            { id: 'a', val: 10, status: 'safe', linkScore: 10 }
        ];

        const action: GameAction = {
            type: 'INSPECTION_STEP',
            payload: {
                list: newList,
                scoreDelta: 50,
                detectedMode: 'ASC'
            }
        };

        const newState = gameReducer(state, action);

        expect(newState.levelScore).toBe(150); // 100 + 50
        expect(newState.list).toEqual(newList);
        expect(newState.detectedMode).toBe('ASC');
    });
  });

});
