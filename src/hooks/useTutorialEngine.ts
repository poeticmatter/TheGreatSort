import { useReducer, useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameContext } from '../context/GameContext';
import { CardItem, GamePhase, AgentRole, ToolInstance } from '../../types';
import { Play, RotateCcw } from 'lucide-react';
import { TOOL_REGISTRY } from '../tools';
import { gradeLevel, calculateCompliance, applyMove } from '../utils/gameLogic';
import { gameReducer, initialState } from '../reducers/gameReducer';
import { useInspectionLoop } from './useInspectionLoop';
import { TUTORIAL_SCENARIOS } from '../config/tutorialScenarios';
import { transformToViewModel } from '../utils/gameViewModelTransformer';
import { UserInterfaceState } from './useGameInteractions';
import { PersistenceService } from '../services/persistence';
import { initialResistanceState } from '../reducers/resistanceReducer';

export function useTutorialEngine() {
    const navigate = useNavigate();
    const { dispatch: globalDispatch } = useGameContext();
    const [currentStepId, setCurrentStepId] = useState<string>('A_INIT');
    const step = TUTORIAL_SCENARIOS[currentStepId];

    // load resistance status directly
    const hasJoinedResistance = PersistenceService.loadResistanceStatus();

    // 1. Reducer State
    const [state, dispatch] = useReducer(gameReducer, {
        ...initialState,
        gameMode: 'TUTORIAL',
        sessionDate: 'TUTORIAL'
    });

    // 2. Computed Metrics (Live)
    const { score: currentYield } = useMemo(() => gradeLevel(state.list), [state.list]);
    const optimalScore = step?.targetYield || 0;
    const isSuccess = step ? step.successCondition(currentYield, optimalScore) : false;
    const compliance = calculateCompliance(currentYield, optimalScore, 0);

    // 3. Loop Driver
    const handleLoopComplete = useCallback(() => {
        dispatch({ type: 'SET_PHASE', payload: { phase: GamePhase.RESULTS } });
    }, []);

    const { startInspection, stopLoop } = useInspectionLoop(state.list, dispatch, handleLoopComplete);

    // 4. Initialization
    useEffect(() => {
        if (!step) return;

        stopLoop(); // Stop any running loop on step change

        const initialItems: CardItem[] = step.initialList.map((val, i) => ({
            id: `tut-${step.id}-${i}`,
            val,
            status: 'pending',
            role: AgentRole.NONE
        }));

        const tools: ToolInstance[] = [{
            instanceId: `tut-tool-${step.allowedTool}`,
            type: step.allowedTool,
            used: false
        }];

        dispatch({
            type: 'INITIALIZE_GAME',
            payload: {
                state: {
                    ...initialState,
                    gameMode: 'TUTORIAL',
                    list: initialItems,
                    initialList: initialItems,
                    toolsAvailable: tools,
                    levelScore: 0,
                    phase: GamePhase.PLANNING,
                    sessionDate: 'TUTORIAL'
                }
            }
        });
    }, [currentStepId, step, stopLoop]);

    // 5. Actions (Mimicking useCoreGame logic simplified)
    const handleToolClick = useCallback((instanceId: string) => {
        if (state.phase !== GamePhase.PLANNING) return;

        // Toggle or Select
        if (state.selectedToolInstanceId === instanceId) {
            dispatch({ type: 'SELECT_TOOL', payload: { toolInstanceId: null } });
        } else {
            dispatch({ type: 'SELECT_TOOL', payload: { toolInstanceId: instanceId } });
        }
    }, [state.phase, state.selectedToolInstanceId]);

    const handleCardClick = useCallback((item: CardItem) => {
        if (state.phase !== GamePhase.PLANNING) return;
        if (isSuccess && state.phase !== GamePhase.RESULTS) return; // Prevent moves if already success?

        const index = state.list.findIndex(i => i.id === item.id);
        if (index === -1) return;

        const toolInstanceId = state.selectedToolInstanceId;
        if (!toolInstanceId) {
            // Select tile
            if (state.selection === index) {
                dispatch({ type: 'CANCEL_SELECTION' });
            } else {
                dispatch({ type: 'SELECT_TILE', payload: { index } });
            }
            return;
        }

        const toolInstance = state.toolsAvailable.find(t => t.instanceId === toolInstanceId);
        if (!toolInstance || toolInstance.used) return;

        const strategy = TOOL_REGISTRY[toolInstance.type];

        // Apply immediately if no selection needed
        if (!strategy.requiresSelection) {
            if (strategy.isValid(state.list, index)) {
                // Apply
                const { newList, impactedIndices } = applyMove(state.list, toolInstance.type, index) as any;

                dispatch({
                    type: 'APPLY_MOVE',
                    payload: {
                        list: newList,
                        impactedIndices,
                        move: {
                            tool: toolInstance.type,
                            toolInstanceId,
                            index,
                            description: 'Tutorial Move'
                        }
                    }
                });
                // Deselect after use
                dispatch({ type: 'SELECT_TOOL', payload: { toolInstanceId: null } });
            }
            return;
        }

        // Two-step
        if (state.selection === null) {
            dispatch({ type: 'SELECT_TILE', payload: { index } });
        } else {
            // Execute
            if (strategy.isValid(state.list, index, state.selection)) {
                const { newList, impactedIndices } = applyMove(state.list, toolInstance.type, index, state.selection) as any;
                dispatch({
                    type: 'APPLY_MOVE',
                    payload: {
                        list: newList,
                        impactedIndices,
                        move: {
                            tool: toolInstance.type,
                            toolInstanceId,
                            index,
                            targetIndex: state.selection,
                            description: 'Tutorial Move'
                        }
                    }
                });
                dispatch({ type: 'SELECT_TOOL', payload: { toolInstanceId: null } });
            } else {
                // Invalid
                dispatch({ type: 'TRIGGER_INVALID_MOVE', payload: { shake: true } });
            }
        }
    }, [state, isSuccess]);

    const handleUndo = useCallback(() => {
        dispatch({ type: 'UNDO_MOVE' });
    }, []);

    const handleRetry = useCallback(() => {
        if (!step) return;
        dispatch({
            type: 'INITIALIZE_GAME',
            payload: {
                state: {
                    ...initialState,
                    gameMode: 'TUTORIAL',
                    list: [...state.initialList],
                    initialList: [...state.initialList],
                    toolsAvailable: state.toolsAvailable.map(t => ({ ...t, used: false })),
                    levelScore: 0,
                    phase: GamePhase.PLANNING
                }
            }
        });
    }, [state.initialList, state.toolsAvailable, step]);

    const handleNext = useCallback(() => {
        if (isSuccess && step?.nextStepId) {
            setCurrentStepId(step.nextStepId);
        }
    }, [isSuccess, step]);

    // 6. View Model Construction
    const data = transformToViewModel(state, { gameMode: 'TUTORIAL' }, {
        sessionDate: 'TUTORIAL',
        isLocked: false,
        dailyResult: null,
        persistenceLoaded: true,
        isResistanceModalOpen: false,
        mood: 'INITIAL',

        compliancePercentage: compliance,
        startingCompliance: 0,
        isZeroYield: currentYield === 0,
        yieldRatio: 0,
        currentYield: currentYield,
        hasJoinedResistance,

        allowedIndices: undefined,
        tutorialMessage: step ? step.instruction(currentYield, optimalScore, isSuccess) : undefined
    });

    const interaction: UserInterfaceState = {
        primaryAction: {
            label: (currentStepId === 'COMPLETE' || (state.phase === GamePhase.RESULTS && isSuccess && step?.nextStepId === 'COMPLETE')) ? 'Begin Work' : (state.phase === GamePhase.RESULTS ? (isSuccess ? 'Next Scenario' : 'Retry') : 'Inspect'),
            variant: (currentStepId === 'COMPLETE' || (isSuccess && state.phase === GamePhase.RESULTS)) ? 'gold' : 'neutral',
            Icon: state.phase === GamePhase.RESULTS ? (isSuccess ? Play : RotateCcw) : Play,
            onClick: (currentStepId === 'COMPLETE' || (state.phase === GamePhase.RESULTS && isSuccess && step?.nextStepId === 'COMPLETE')) ? () => navigate('/') : (state.phase === GamePhase.RESULTS ? (isSuccess ? handleNext : handleRetry) : startInspection),
            disabled: state.phase === GamePhase.INSPECTING
        },
        secondaryAction: {
            label: 'Undo',
            variant: 'neutral',
            Icon: RotateCcw,
            onClick: handleUndo,
            disabled: state.movesHistory.length === 0 || state.phase === GamePhase.INSPECTING || state.phase === GamePhase.RESULTS
        },
        feedback: {
            showAuditBoard: false,
            isBoardDisabled: false,
            allowedIndices: undefined
        }
    };

    const actions = {
        handleCardClick,
        handleToolClick,
        handleBackgroundClick: () => dispatch({ type: 'CANCEL_SELECTION' }),
        changeMode: (mode: any) => {
            if (mode === 'TUTORIAL') return;
            globalDispatch({ type: 'SET_GAME_MODE', payload: { mode } });
            navigate('/');
        },
        startInspection,
        retryPractice: () => { },
        retryDaily: () => { },
        resetGame: () => { },
        closeAudit: () => { },
        triggerCurrentAudit: () => { },
        triggerResistance: () => { },
        closeResistance: () => dispatch({ type: 'CLOSE_RESISTANCE_VIEW' }),
        saveDaily: () => { },
        handleCardClick,
        handleToolClick,
        handleUndo,
        showLockedResistance: () => dispatch({ type: 'SHOW_LOCKED_RESISTANCE' }),
        joinResistance: () => { },
        dismissResistance: () => dispatch({ type: 'CLOSE_RESISTANCE_VIEW' }),
        trackShare: () => { }
    };

    return { data, interaction, actions };
}
