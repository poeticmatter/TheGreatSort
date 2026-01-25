import { describe, it, expect } from 'vitest';
import { gameReducer, initialState } from '../gameReducer';
import { GameAction } from '../gameState';
import { GamePhase, ToolInstance, CardItem } from '../../../types';

describe('gameReducer', () => {

  it('should return initial state', () => {
    // @ts-ignore
    const state = gameReducer(initialState, {} as GameAction);
    expect(state).toEqual(initialState);
  });

  it('should handle START_LEVEL', () => {
    const mockList: CardItem[] = [{ id: '1', val: 10, status: 'pending', linkScore: null }];
    const mockTools: ToolInstance[] = [{ instanceId: 't1', type: 'swap', used: false }];

    const action: GameAction = {
      type: 'START_LEVEL',
      payload: { level: 1, list: mockList, tools: mockTools, seed: 12345 }
    };

    const newState = gameReducer(initialState, action);
    expect(newState.level).toBe(1);
    expect(newState.list).toEqual(mockList);
    expect(newState.toolsAvailable).toEqual(mockTools);
  });

  describe('INTERACT_TOOL', () => {
    it('should select a tool', () => {
      const tools: ToolInstance[] = [{ instanceId: 't1', type: 'swap', used: false }];
      const state = { ...initialState, phase: GamePhase.PLANNING, toolsAvailable: tools };
      
      const newState = gameReducer(state, { type: 'INTERACT_TOOL', payload: { toolInstanceId: 't1' } });
      expect(newState.selectedToolInstanceId).toBe('t1');
    });

    it('should deselect if same tool clicked', () => {
      const tools: ToolInstance[] = [{ instanceId: 't1', type: 'swap', used: false }];
      const state = { ...initialState, phase: GamePhase.PLANNING, toolsAvailable: tools, selectedToolInstanceId: 't1' };
      
      const newState = gameReducer(state, { type: 'INTERACT_TOOL', payload: { toolInstanceId: 't1' } });
      expect(newState.selectedToolInstanceId).toBeNull();
    });
  });

  describe('INTERACT_TILE', () => {
    // Setup
    const list: CardItem[] = [
      { id: 'a', val: 10, status: 'pending', linkScore: null },
      { id: 'b', val: 20, status: 'pending', linkScore: null },
      { id: 'c', val: 30, status: 'pending', linkScore: null }
    ];
    const tools: ToolInstance[] = [{ instanceId: 't1', type: 'swap', used: false }];
    const baseState = { ...initialState, list, toolsAvailable: tools, phase: GamePhase.PLANNING };

    it('should toggle selection if no tool active', () => {
      const s1 = gameReducer(baseState, { type: 'INTERACT_TILE', payload: { index: 0 } });
      expect(s1.selection).toBe(0);

      const s2 = gameReducer(s1, { type: 'INTERACT_TILE', payload: { index: 0 } });
      expect(s2.selection).toBeNull();
    });

    it('should select first card if tool active but no selection', () => {
      const state = { ...baseState, selectedToolInstanceId: 't1' };
      const newState = gameReducer(state, { type: 'INTERACT_TILE', payload: { index: 0 } });
      expect(newState.selection).toBe(0);
    });

    it('should execute move if valid target clicked (Swap 0 & 1)', () => {
      const state = { ...baseState, selectedToolInstanceId: 't1', selection: 0 };
      const newState = gameReducer(state, { type: 'INTERACT_TILE', payload: { index: 1 } }); // Adjacent to 0

      // Check Swap Happened
      expect(newState.list[0].val).toBe(20);
      expect(newState.list[1].val).toBe(10);
      
      // Check Tool Used
      expect(newState.toolsAvailable[0].used).toBe(true);
      
      // Check Reset
      expect(newState.selection).toBeNull();
      expect(newState.selectedToolInstanceId).toBeNull();
    });

    it('should shake (invalid move) if target not valid (Swap 0 & 2)', () => {
      const state = { ...baseState, selectedToolInstanceId: 't1', selection: 0 };
      const newState = gameReducer(state, { type: 'INTERACT_TILE', payload: { index: 2 } }); // Not adjacent

      // Check List Unchanged
      expect(newState.list[0].val).toBe(10);
      
      // Check Shake
      expect(newState.shakeTools).toBeGreaterThan(0);
      expect(newState.toolsAvailable[0].used).toBe(false);
    });
  });
});
