import { useRef, useEffect, useCallback } from 'react';
import { useGameContext } from '../context/GameContext';
import { GamePhase, CardItem, ToolInstance } from '../../types';
import { useGameLoop } from './useGameLoop';
import { useAnalytics } from './useAnalytics';
import { TOOL_REGISTRY } from '../tools';
import { applyMove } from '../utils/gameLogic';

interface UseCoreGameProps {
    onGameComplete?: (score: number) => void;
}

export function useCoreGame({ onGameComplete }: UseCoreGameProps = {}) {
    const { state, dispatch } = useGameContext();
    const { trackToolInteraction } = useAnalytics(); // Core gameplay analytics

    // --- Handlers ---
    const handleToolClick = useCallback((toolInstanceId: string) => {
        // Validation
        const toolInstance = state.toolsAvailable.find(t => t.instanceId === toolInstanceId);
        if (!toolInstance || toolInstance.used) return;

        // Toggle / Switching Logic
        if (state.selectedToolInstanceId === toolInstanceId) {
            dispatch({ type: 'SELECT_TOOL', payload: { toolInstanceId: null } }); // Deselect
            return;
        }

        const strategy = TOOL_REGISTRY[toolInstance.type]; // Need TOOL_REGISTRY interaction
        if (!strategy) return;

        // Immediate Execution Logic (Card already selected + 1-step tool)
        if (state.selection !== null && !strategy.requiresSelection) {
            if (strategy.isValid(state.list, state.selection)) {
                // Execute move immediately
                const targetIndex = state.selection;
                const newList = applyMove(state.list, toolInstance.type, targetIndex);

                dispatch({
                    type: 'APPLY_MOVE',
                    payload: {
                        list: newList,
                        move: {
                            tool: toolInstance.type,
                            toolInstanceId: toolInstanceId,
                            index: targetIndex,
                            description: `${toolInstance.type} at ${targetIndex}`
                        }
                    }
                });
                return;
            }
        }

        // Default: Select Tool
        dispatch({ type: 'SELECT_TOOL', payload: { toolInstanceId } });
        trackToolInteraction(toolInstance.type, 'select');

    }, [dispatch, state.toolsAvailable, state.selection, state.list, state.selectedToolInstanceId, trackToolInteraction]);

    const handleUndo = useCallback(() => {
        if (state.movesHistory.length > 0) {
            dispatch({ type: 'UNDO_MOVE' });
            dispatch({ type: 'CANCEL_SELECTION' });
        }
    }, [dispatch, state.movesHistory.length]);

    const handleCardClick = useCallback((item: CardItem) => {
        const index = state.list.findIndex(i => i.id === item.id);
        if (index === -1) return;

        // Must have tool selected
        const toolInstanceId = state.selectedToolInstanceId;
        if (!toolInstanceId) return;

        const toolInstance = state.toolsAvailable.find(t => t.instanceId === toolInstanceId);
        if (!toolInstance || toolInstance.used) {
            dispatch({ type: 'SELECT_TOOL', payload: { toolInstanceId: null } });
            return;
        }

        const strategy = TOOL_REGISTRY[toolInstance.type];

        // 1. One-Step Tool
        if (!strategy.requiresSelection) {
            if (strategy.isValid(state.list, index)) {
                const newList = applyMove(state.list, toolInstance.type, index);
                dispatch({
                    type: 'APPLY_MOVE',
                    payload: {
                        list: newList,
                        move: {
                            tool: toolInstance.type,
                            toolInstanceId: toolInstanceId,
                            index: index,
                            description: `${toolInstance.type} at ${index}`
                        }
                    }
                });
            } else {
                dispatch({ type: 'TRIGGER_INVALID_MOVE', payload: { shake: true } });
            }
            return;
        }

        // 2. Two-Step Tool
        // If nothing selected, select this card (via internal state logic? Or can we treat 'selection' as a Reducer state?)
        // The reducer has 'selection'. We cancelled selection in 'SELECT_TOOL' if strictly toggling, but we kept it otherwise.
        // Wait, 'SELECT_TOOL' in my new reducer IMPLEMENTATION:
        /*
        case 'SELECT_TOOL': 
             return { ...state, selectedToolInstanceId: toolInstanceId }
        */
        // It doesn't touch `selection`? 
        // If I click a card and no selection exists -> I need to set selection?
        // Wait, gameReducer.ts doesn't have `SELECT_CARD`?
        // Ah, `INTERACT_TILE` used to handle "Select this if nothing selected".
        // I need a `SELECT_TILE` action or similar?
        // Or I can use `CANCEL_SELECTION` (deselect) but how to SELECT?
        // I need to add `SELECT_TILE` to reducer?
        // Or reuse `SELECT_TOOL`... no.

        // The instructions said "Reducer should only accept Executive actions... SELECT_TOOL, APPLY_MOVE".
        // Did I miss `SELECT_TILE`?
        // "The logic for ... belongs in ... interaction hook".
        // But if the "Selection" state needs to be persisted in the Reducer (to highlight the card), I need an action to set it.
        // Unless "Selection" is now Local State?
        // The Prompt said: "Remove all INTERACT_TOOL and INTERACT_TILE logic... The View should be dumb... useGameInteractions...".
        // But `PuzzleBoard` reads `state.selection`.
        // So Selection MUST be in Reducer state (or Context).
        // I should add `SELECT_TILE` (simple setter) to reducer? Or `SET_SELECTION`.

        // I'll assume I should add `SET_SELECTION` or `SELECT_TILE` (executive) to reducer. 
        // Or can I use `APPLY_MOVE`? No.

        // Let's add `SELECT_TILE` to reducer quickly since I rewrote it. Or is it `SELECT_ITEM`?
        // `INTERACT_TILE` did: `return { ...state, selection: index };`

        if (state.selection === null) {
            // Select this card as the first target
            dispatch({ type: 'SELECT_TILE', payload: { index } });
        } else {
            // Second click -> Execute
            if (strategy.isValid(state.list, index, state.selection)) {
                const newList = applyMove(state.list, toolInstance.type, index, state.selection);
                dispatch({
                    type: 'APPLY_MOVE',
                    payload: {
                        list: newList,
                        move: {
                            tool: toolInstance.type,
                            toolInstanceId: toolInstanceId,
                            index: index,
                            targetIndex: state.selection,
                            description: `${toolInstance.type} ${state.selection} and ${index}`
                        }
                    }
                });
            } else {
                dispatch({ type: 'TRIGGER_INVALID_MOVE', payload: { shake: true } });
            }
        }

    }, [dispatch, state.list, state.selectedToolInstanceId, state.selection, state.toolsAvailable]);

    const handleBackgroundClick = useCallback(() => {
        dispatch({ type: 'CANCEL_SELECTION' });
    }, [dispatch]);

    const initLevel = useCallback((level: number, list: CardItem[], tools: ToolInstance[], seed?: number, flavorMap?: Record<string, string>, movesHistory: any[] = [], initialList?: CardItem[]) => {
        dispatch({
            type: 'START_LEVEL',
            payload: {
                level,
                list,
                tools,
                seed,
                flavorMap,
                movesHistory,
                initialList
            }
        });
    }, [dispatch]);

    // --- Side Effect: Track Move Usage ---
    const prevMovesLength = useRef(state.movesHistory.length);
    useEffect(() => {
        if (state.movesHistory.length > prevMovesLength.current) {
            const lastMove = state.movesHistory[state.movesHistory.length - 1];
            trackToolInteraction(lastMove.tool, 'use');
        }
        prevMovesLength.current = state.movesHistory.length;
    }, [state.movesHistory, trackToolInteraction]);


    // --- Game Loop Integration ---
    const handleLoopCompletion = useCallback(() => {
        dispatch({ type: 'SET_PHASE', payload: { phase: GamePhase.RESULTS } });

        // Calculate total score update?
        // In useGame: 
        // dispatch({ type: 'SET_TOTAL_SCORE', payload: { score: state.totalScore + state.levelScore } });
        // This seems "Core" enough (score aggregation).
        // Or is Total Score a "Session/Meta" concept? 
        // The reducer handles levelScore. 
        // Let's update totals here as it's part of the game session state in Redux/Context.

        dispatch({ type: 'SET_TOTAL_SCORE', payload: { score: state.totalScore + state.levelScore } });
        if (state.optimalScore) {
            dispatch({ type: 'SET_TOTAL_OPTIMAL_SCORE', payload: { score: state.totalOptimalScore + state.optimalScore } });
        }

        if (onGameComplete) {
            onGameComplete(state.levelScore);
        }
    }, [dispatch, state.levelScore, state.totalScore, state.totalOptimalScore, state.optimalScore, onGameComplete]);

    const loop = useGameLoop(state.list, dispatch, handleLoopCompletion);

    return {
        state, // Expose full context state (read-only mostly)
        dispatch, // Expose dispatch if needed, but try to use actions
        actions: {
            handleToolClick,
            handleUndo,
            handleCardClick,
            handleBackgroundClick,
            startInspection: loop.startInspection,
            initLevel, // Core way to start/load a level
            stopLoop: loop.stopLoop
        }
    };
}
