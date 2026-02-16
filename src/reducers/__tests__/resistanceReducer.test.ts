import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resistanceReducer, initialResistanceState } from '../resistanceReducer';
import { GameAction, ResistanceState } from '../gameState';
import { ResistanceStatus } from '../../../types';

describe('resistanceReducer', () => {

    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
    });

    it('should return initial state for unknown action', () => {
        // @ts-ignore - Testing unknown action
        const state = resistanceReducer(initialResistanceState, { type: 'UNKNOWN_ACTION' });
        expect(state).toEqual(initialResistanceState);
    });

    describe('ACTIVATE_RESISTANCE', () => {
        it('should transition from INACTIVE to ACTIVE', () => {
            const action: GameAction = { type: 'ACTIVATE_RESISTANCE' };
            const newState = resistanceReducer(initialResistanceState, action);

            expect(newState.status).toBe(ResistanceStatus.ACTIVE);
            expect(newState.isViewOpen).toBe(true);
            expect(newState.hasTriggered).toBe(true);
        });

        it('should reject activation when already ACTIVE and log warning', () => {
            const activeState: ResistanceState = {
                ...initialResistanceState,
                status: ResistanceStatus.ACTIVE
            };
            const action: GameAction = { type: 'ACTIVATE_RESISTANCE' };
            const newState = resistanceReducer(activeState, action);

            expect(newState).toBe(activeState); // Same reference = unchanged
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Invalid transition')
            );
        });
    });



    describe('SET_RESISTANCE_STATUS', () => {
        it('should allow valid transition ACTIVE → SUCCESS', () => {
            const activeState: ResistanceState = {
                ...initialResistanceState,
                status: ResistanceStatus.ACTIVE
            };
            const action: GameAction = {
                type: 'SET_RESISTANCE_STATUS',
                payload: { status: ResistanceStatus.SUCCESS }
            };
            const newState = resistanceReducer(activeState, action);

            expect(newState.status).toBe(ResistanceStatus.SUCCESS);
        });

        it('should reject invalid transition INACTIVE → SUCCESS and log warning', () => {
            const action: GameAction = {
                type: 'SET_RESISTANCE_STATUS',
                payload: { status: ResistanceStatus.SUCCESS }
            };
            const newState = resistanceReducer(initialResistanceState, action);

            expect(newState).toBe(initialResistanceState);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Invalid transition')
            );
        });

        it('should reject invalid status payload', () => {
            const action = {
                type: 'SET_RESISTANCE_STATUS',
                payload: { status: 'INVALID_STATUS' }
            } as unknown as GameAction;
            const newState = resistanceReducer(initialResistanceState, action);

            expect(newState).toBe(initialResistanceState);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Invalid payload'),
                expect.anything()
            );
        });
    });

    describe('RESISTANCE_MISSION_COMPLETE', () => {
        it('should allow valid transition ACTIVE → EXPOSED', () => {
            const activeState: ResistanceState = {
                ...initialResistanceState,
                status: ResistanceStatus.ACTIVE
            };
            const action: GameAction = {
                type: 'RESISTANCE_MISSION_COMPLETE',
                payload: { status: ResistanceStatus.EXPOSED }
            };
            const newState = resistanceReducer(activeState, action);

            expect(newState.status).toBe(ResistanceStatus.EXPOSED);
        });

        it('should reject invalid transition and log warning', () => {
            const action: GameAction = {
                type: 'RESISTANCE_MISSION_COMPLETE',
                payload: { status: ResistanceStatus.EXPOSED }
            };
            const newState = resistanceReducer(initialResistanceState, action);

            expect(newState).toBe(initialResistanceState);
            expect(consoleWarnSpy).toHaveBeenCalled();
        });
    });

    describe('CLOSE_RESISTANCE_VIEW', () => {
        it('should close the view without changing status', () => {
            const openState: ResistanceState = {
                ...initialResistanceState,
                isViewOpen: true,
                status: ResistanceStatus.ACTIVE
            };
            const action: GameAction = { type: 'CLOSE_RESISTANCE_VIEW' };
            const newState = resistanceReducer(openState, action);

            expect(newState.isViewOpen).toBe(false);
            expect(newState.status).toBe(ResistanceStatus.ACTIVE);
        });
    });
});
