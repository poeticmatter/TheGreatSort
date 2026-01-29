import { useRef, useEffect, useCallback } from 'react';
import { useGameContext } from '../context/GameContext';
import { GamePhase, CardItem, ToolInstance } from '../types';
import { useGameLoop } from './useGameLoop';
import { useAnalytics } from './useAnalytics';

interface UseCoreGameProps {
    onGameComplete?: (score: number) => void;
}

export function useCoreGame({ onGameComplete }: UseCoreGameProps = {}) {
    const { state, dispatch } = useGameContext();
    const { trackToolInteraction } = useAnalytics(); // Core gameplay analytics

    // --- Handlers ---
    const handleToolClick = useCallback((toolInstanceId: string) => {
        dispatch({ type: 'INTERACT_TOOL', payload: { toolInstanceId } });
        const tool = state.toolsAvailable.find(t => t.instanceId === toolInstanceId);
        if (tool) {
            trackToolInteraction(tool.type, 'select');
        }
    }, [dispatch, state.toolsAvailable, trackToolInteraction]);

    const handleUndo = useCallback(() => {
        if (state.movesHistory.length > 0) {
            dispatch({ type: 'UNDO_MOVE' });
            dispatch({ type: 'CANCEL_SELECTION' });
        }
    }, [dispatch, state.movesHistory.length]);

    const handleCardClick = useCallback((item: CardItem) => {
        const index = state.list.findIndex(i => i.id === item.id);
        if (index === -1) return;
        dispatch({ type: 'INTERACT_TILE', payload: { index } });
    }, [dispatch, state.list]);

    const handleBackgroundClick = useCallback(() => {
        dispatch({ type: 'CANCEL_SELECTION' });
    }, [dispatch]);

    const initLevel = useCallback((level: number, list: CardItem[], tools: ToolInstance[], seed?: number, flavorMap?: Record<string, string>, movesHistory: any[] = []) => {
        dispatch({
            type: 'START_LEVEL',
            payload: {
                level,
                list,
                tools,
                seed,
                flavorMap,
                movesHistory
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
