import { describe, it, expect } from 'vitest';
import { gameReducer, initialState } from '../gameReducer';
import { GameAction, GameState } from '../gameState';
import { GamePhase, ToolInstance, CardItem } from '../../../types';

describe('gameReducer', () => {

  it('should return initial state', () => {
    // @ts-ignore
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

  describe('INTERACT_TILE (Selection)', () => {
    it('should select a card if no tool is selected', () => {
      const state = { ...initialState, phase: GamePhase.PLANNING };
      const action: GameAction = {
        type: 'INTERACT_TILE',
        payload: { index: 2 }
      };
      const result = gameReducer(state, action);
      expect(result.selection).toBe(2);
    });

    it('should deselect if same card clicked', () => {
      const state = { ...initialState, phase: GamePhase.PLANNING, selection: 2 };
      const action: GameAction = {
        type: 'INTERACT_TILE',
        payload: { index: 2 }
      };
      const result = gameReducer(state, action);
      expect(result.selection).toBeNull();
    });
  });

  describe('INTERACT_TOOL', () => {
    it('should select a tool', () => {
        const tool: ToolInstance = { instanceId: 't1', type: 'swap', used: false };
        const state = { 
            ...initialState, 
            phase: GamePhase.PLANNING,
            toolsAvailable: [tool] 
        };

        const action: GameAction = {
            type: 'INTERACT_TOOL',
            payload: { toolInstanceId: 't1' }
        };

        const result = gameReducer(state, action);
        expect(result.selectedToolInstanceId).toBe('t1');
    });
  });

  describe('INTERACT_TILE (Execution - Valid)', () => {
    // Setup state
    const startingList: CardItem[] = [
      { id: 'a', val: 10, status: 'pending', linkScore: null },
      { id: 'b', val: 20, status: 'pending', linkScore: null }
    ];
    const tool: ToolInstance = { instanceId: 't1', type: 'swap', used: false };
    
    const readyState: GameState = {
      ...initialState,
      list: startingList,
      toolsAvailable: [tool],
      selectedToolInstanceId: 't1',
      selection: 0 // First card selected
    };

    it('should execute swap when clicking valid adjacent target', () => {
      const action: GameAction = {
        type: 'INTERACT_TILE',
        payload: { index: 1 } // Click second card
      };

      const newState = gameReducer(readyState, action);

      // Verify Swap
      expect(newState.list[0].val).toBe(20);
      expect(newState.list[1].val).toBe(10);

      // Verify Tool Used
      const usedTool = newState.toolsAvailable.find(t => t.instanceId === 't1');
      expect(usedTool?.used).toBe(true);

      // Verify Selection Cleared
      expect(newState.selection).toBeNull();
      expect(newState.selectedToolInstanceId).toBeNull();
      
      // Verify History
      expect(newState.movesHistory).toHaveLength(1);
    });
  });

  describe('INTERACT_TILE (Execution - Invalid)', () => {
    const startingList: CardItem[] = [
      { id: 'a', val: 10, status: 'pending', linkScore: null },
      { id: 'b', val: 20, status: 'pending', linkScore: null },
      { id: 'c', val: 30, status: 'pending', linkScore: null }
    ];
    const tool: ToolInstance = { instanceId: 't1', type: 'swap', used: false };
    
    // Swap requires adjacency. 0 and 2 are not adjacent.
    const readyState: GameState = {
      ...initialState,
      list: startingList,
      toolsAvailable: [tool],
      selectedToolInstanceId: 't1',
      selection: 0
    };

    it('should not change list and should shake tools on invalid move', () => {
      const action: GameAction = {
        type: 'INTERACT_TILE',
        payload: { index: 2 }
      };

      const newState = gameReducer(readyState, action);

      // List Unchanged
      expect(newState.list[0].val).toBe(10);
      expect(newState.list[2].val).toBe(30);

      // Tool Not Used
      const usedTool = newState.toolsAvailable.find(t => t.instanceId === 't1');
      expect(usedTool?.used).toBe(false);

      // Shake Triggered
      expect(newState.shakeTools).toBeGreaterThan(readyState.shakeTools);
    });
  });

});
