import { useCallback } from 'react';
import { useGameContext } from '../context/GameContext';
import { GamePhase, CardItem, ToolInstance, Move } from '../../types';
import { useInspectionLoop } from './useInspectionLoop';
import { TOOL_REGISTRY } from '../tools';
import { applyMove } from '../utils/gameLogic';

interface UseCoreGameProps {
    onGameComplete?: (score: number) => void;
    onMoveApplied?: (newList: CardItem[], move: Move) => void;
}

export function useCoreGame({ onGameComplete, onMoveApplied }: UseCoreGameProps = {}) {
    const { state, dispatch } = useGameContext();
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

        // Switching to a different tool (or Tile-First Interaction)

        if (state.selection !== null) {
            const toolStrategy = TOOL_REGISTRY[toolInstance.type];

            // If the tool is single-target (e.g. Promote, Demote, Sink), execute immediately on the selected tile!
            if (!toolStrategy.requiresSelection) {

                if (toolStrategy.isValid(state.list, state.selection)) {
                    // Type assertion for tool result
                    const result = applyMove(state.list, toolInstance.type, state.selection) as unknown as { newList: CardItem[], impactedIndices: number[] };
                    const { newList, impactedIndices } = result;

                    dispatch({
                        type: 'APPLY_MOVE',
                        payload: {
                            list: newList,
                            impactedIndices,
                            move: {
                                tool: toolInstance.type,
                                toolInstanceId: toolInstanceId,
                                index: state.selection,
                                description: `${toolInstance.type} at ${state.selection}`
                            }
                        }
                    });

                    if (onMoveApplied) {
                        onMoveApplied(newList, {
                            tool: toolInstance.type,
                            toolInstanceId: toolInstanceId,
                            index: state.selection,
                            description: `${toolInstance.type} at ${state.selection}`
                        });
                    }

                    // Reset selection after immediate use
                    dispatch({ type: 'CANCEL_SELECTION' });
                    dispatch({ type: 'SELECT_TOOL', payload: { toolInstanceId: null } });

                    // Exit early only if we successfully executed
                    return;
                }
                // If invalid, fall through to standard selection (equip tool)
            }
        }


        // If the tool is multi-target (Swap), just equip it.
        // The existing selection will serve as the "first target".


        // Standard Selection (No Tile, or Multi-Target Tile-First)
        dispatch({ type: 'SELECT_TOOL', payload: { toolInstanceId } });

    }, [dispatch, state.toolsAvailable, state.selectedToolInstanceId, state.selection, onMoveApplied, state.list, state.gameMode]);


    // [Lines 88-193 unchanged, skipped in replacement block for brevity but instructed replaced here strictly if contiguous? 
    // Wait, replace_file_content requires contiguous. I'll split this.]
    // I will replace only impacted blocks.

    // 1. Remove from destructuring
    // 2. Remove from handleToolClick deps and call
    // 3. Remove useEffect tracking usage


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

        if (!toolInstanceId) {
            // Allow selecting a tile without a tool (Tile-First Workflow)
            dispatch({ type: 'SELECT_TILE', payload: { index } });
            return;
        }

        const toolInstance = state.toolsAvailable.find(t => t.instanceId === toolInstanceId);
        if (!toolInstance || toolInstance.used) {
            dispatch({ type: 'SELECT_TOOL', payload: { toolInstanceId: null } });
            // Since we just deselected, maybe we should also toggle tag?
            // "Clicking card cancels tool if tool bad" -> User intention was tool use.
            // Let's stop here.
            return;
        }

        const strategy = TOOL_REGISTRY[toolInstance.type];

        // 1. One-Step Tool
        if (!strategy.requiresSelection) {
            if (strategy.isValid(state.list, index)) {
                const { newList, impactedIndices } = applyMove(state.list, toolInstance.type, index) as { newList: CardItem[], impactedIndices: number[] };
                dispatch({
                    type: 'APPLY_MOVE',
                    payload: {
                        list: newList,
                        impactedIndices,
                        move: {
                            tool: toolInstance.type,
                            toolInstanceId: toolInstanceId,
                            index: index,
                            description: `${toolInstance.type} at ${index}`
                        }
                    }
                });

                if (onMoveApplied) {
                    onMoveApplied(newList, {
                        tool: toolInstance.type,
                        toolInstanceId: toolInstanceId,
                        index: index,
                        description: `${toolInstance.type} at ${index}`
                    });
                }
            } else {
                dispatch({ type: 'TRIGGER_INVALID_MOVE', payload: { shake: true } });
            }
            return;
        }

        // 2. Two-Step Tool
        if (state.selection === null) {
            // Select this card as the first target
            dispatch({ type: 'SELECT_TILE', payload: { index } });
        } else {
            // Second click -> Execute
            if (strategy.isValid(state.list, index, state.selection)) {
                const { newList, impactedIndices } = applyMove(state.list, toolInstance.type, index, state.selection) as { newList: CardItem[], impactedIndices: number[] };
                dispatch({
                    type: 'APPLY_MOVE',
                    payload: {
                        list: newList,
                        impactedIndices,
                        move: {
                            tool: toolInstance.type,
                            toolInstanceId: toolInstanceId,
                            index: index,
                            targetIndex: state.selection,
                            description: `${toolInstance.type} ${state.selection} and ${index}`
                        }
                    }
                });

                if (onMoveApplied) {
                    onMoveApplied(newList, {
                        tool: toolInstance.type,
                        toolInstanceId: toolInstanceId,
                        index: index,
                        targetIndex: state.selection,
                        description: `${toolInstance.type} ${state.selection} and ${index}`
                    });
                }
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

    const loop = useInspectionLoop(state.list, dispatch, handleLoopCompletion);

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
