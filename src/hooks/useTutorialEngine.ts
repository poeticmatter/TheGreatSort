
import { useState, useMemo, useCallback, useEffect } from 'react';
import { CardItem, GamePhase, ToolType, AgentRole, ResistanceStatus } from '../../types';
import { GameViewModel } from '../types/GameViewModel';
import { UserInterfaceState } from './useGameInteractions';
import { Play, RotateCcw } from 'lucide-react';
import { TOOL_REGISTRY } from '../tools';
import { gradeLevel, calculateCompliance, createInspectionStream, InspectionYield } from '../utils/gameLogic';
import { applyMove } from '../utils/gameLogic';

interface TutorialGameState {
    list: CardItem[];
    selection: number | null;
    selectedTool: ToolType | null;
    history: CardItem[][];
    phase: GamePhase;
    preInspectionList: CardItem[] | null;
}

interface TutorialStep {
    id: string;
    initialList: number[];
    allowedTool: ToolType;
    targetYield: number;
    description: string;
    instruction: (currentYield: number, targetYield: number, isSuccess: boolean) => string;
    nextStepId?: string;
    successCondition: (currentYield: number, targetYield: number) => boolean;
}

const STEPS: Record<string, TutorialStep> = {
    'A_INIT': {
        id: 'A_INIT',
        initialList: [2, 8, 5, 6, 1, 9],
        allowedTool: 'sink',
        targetYield: 27,
        description: 'The Blocker',
        instruction: (currentYield, targetYield, isSuccess) => {
            if (isSuccess) return "Excellent! The sequence flows correctly. Yield maximized.";
            if (currentYield < targetYield && currentYield > 19) return `Good. However, the optimal yield is higher. Can you find a better solution?`;
            return `The current yield is ${currentYield}. Can you increase the yield by sinking the 8?`;
        },
        successCondition: (c, t) => c >= t,
        nextStepId: 'B_INIT'
    },
    'B_INIT': {
        id: 'B_INIT',
        initialList: [6, 5, 12, 3, 14, 2],
        allowedTool: 'swap',
        targetYield: 23,
        description: 'The Pivot',
        instruction: (c, t, isSuccess) => {
            if (isSuccess) return "Well done. By switching to Ascending, you saved the 12.";
            return "The inspector protocol is locked to DESCENDING because 6 > 5. Swap the 6 and 5 to force ASCENDING mode.";
        },
        successCondition: (c, t) => c >= 23,
        nextStepId: 'COMPLETE'
    },
    'COMPLETE': {
        id: 'COMPLETE',
        initialList: [],
        allowedTool: 'sink',
        targetYield: 0,
        description: 'Complete',
        instruction: () => "Tutorial Complete! You are ready.",
        successCondition: () => false
    }
};

export function useTutorialEngine() {
    const [currentStepId, setCurrentStepId] = useState<string>('A_INIT');
    const [gameState, setGameState] = useState<TutorialGameState>({
        list: [],
        selection: null,
        selectedTool: null,
        history: []
    });

    const step = STEPS[currentStepId];

    // Initialize Step
    useEffect(() => {
        if (!step) return;
        const initialItems: CardItem[] = step.initialList.map((val, i) => ({
            id: `tut-${step.id}-${i}`,
            val,
            status: 'pending',
            role: AgentRole.NONE
        }));
        setGameState({
            list: initialItems,
            selection: null,
            selectedTool: null,
            history: [], // Reset history on step change
            phase: GamePhase.PLANNING,
            preInspectionList: null
        });
    }, [currentStepId]);

    // Computed State
    const { score: currentYield, gradedList } = useMemo(() => gradeLevel(gameState.list), [gameState.list]);

    // We assume the target yield in the step generic is the "Optimal" for the tutorial context
    // But we can also calculate real optimal if we want
    // const realOptimal = useMemo(() => findOptimalScore(gameState.list, [{ type: step.allowedTool, instanceId: 'tut', used: false }]), [gameState.list, step.allowedTool]);
    // Allow step to define target for simplicity and narrative control
    const optimalScore = step.targetYield;

    const isSuccess = step.successCondition(currentYield, optimalScore);

    const compliance = calculateCompliance(currentYield, optimalScore, 0);

    // Actions
    const startInspection = useCallback(() => {
        const stream = [...createInspectionStream(gameState.list)];
        const originalList = gameState.list;

        setGameState(prev => ({
            ...prev,
            phase: GamePhase.INSPECTING,
            preInspectionList: originalList
        }));

        let stepIndex = 0;
        const intervalId = setInterval(() => {
            if (stepIndex >= stream.length) {
                clearInterval(intervalId);
                // End of inspection, immediately show results
                setGameState(prev => ({
                    ...prev,
                    phase: GamePhase.RESULTS
                }));
                return;
            }

            const step = stream[stepIndex];
            setGameState(prev => ({ ...prev, list: step.list }));
            stepIndex++;
        }, 500); // 500ms per step

    }, [gameState.list]);
    const handleToolClick = useCallback((instanceId: string) => {
        // Toggle selection
        setGameState(prev => ({
            ...prev,
            selectedTool: prev.selectedTool ? null : step.allowedTool, // Toggle or select allowed
            selection: null // Reset card selection on tool change
        }));
    }, [step.allowedTool]);
    const handleUndo = useCallback(() => {
        setGameState(prev => {
            if (prev.history.length === 0) return prev;
            const newHistory = [...prev.history];
            const previousList = newHistory.pop()!;
            return {
                ...prev,
                list: previousList,
                selection: null,
                selectedTool: null,
                history: newHistory,
                phase: GamePhase.PLANNING, // Reset phase on undo
                preInspectionList: null
            };
        });
    }, []);

    const handleRetry = useCallback(() => {
        setGameState(prev => ({
            ...prev,
            phase: GamePhase.PLANNING,
            list: prev.preInspectionList || prev.list, // Restore pre-inspection state
            preInspectionList: null
        }));
    }, []);

    const handleCardClick = useCallback((item: CardItem) => {
        if (isSuccess) return; // Prevent moves after success

        const index = gameState.list.findIndex(i => i.id === item.id);
        if (index === -1) return;

        if (!gameState.selectedTool) return; // Must select tool first

        const toolType = step.allowedTool;
        const strategy = TOOL_REGISTRY[toolType];

        // Selection Logic
        let newSelection = gameState.selection;
        let shouldApply = false;

        if (strategy.requiresSelection) {
            if (gameState.selection === null) {
                // Select first
                newSelection = index;
            } else if (gameState.selection === index) {
                // Deselect
                newSelection = null;
            } else {
                // Apply with selection
                shouldApply = true;
            }
        } else {
            // Apply immediately
            shouldApply = true;
        }

        if (shouldApply) {
            // Validate
            // For Sink, valid if adjacent (implied by Strategy)
            const sel = strategy.requiresSelection ? gameState.selection : undefined;

            if (strategy.isValid(gameState.list, index, sel)) {
                // Apply
                const { newList } = applyMove(gameState.list, toolType, index, sel);

                // Update State
                setGameState(prev => ({
                    ...prev,
                    list: newList,
                    selectedTool: null, // Deselect tool after use
                    history: [...prev.history, prev.list]
                }));
            } else {
                // Invalid move visual feedback?
                // Just reset selection for now
                if (strategy.requiresSelection) newSelection = index; // switch selection?
            }
        } else {
            setGameState(prev => ({ ...prev, selection: newSelection }));
        }

    }, [gameState.list, gameState.selection, gameState.selectedTool, isSuccess, step.allowedTool]);


    const handleNext = useCallback(() => {
        if (isSuccess && step.nextStepId) {
            setCurrentStepId(step.nextStepId);
        }
    }, [isSuccess, step.nextStepId]);

    // View Model
    const data: GameViewModel = {
        list: gameState.list, // Use raw list (which now contains animation frames during inspection)
        initialList: gameState.list, // Technically initial for this step? Or previous? Using current for now to satisfy type
        phase: gameState.phase, // Dynamic phase
        gameMode: 'DAILY', // Use DAILY to show ComplianceMeter
        sessionDate: 'TUTORIAL',
        isLocked: false,
        dailyCompleted: false,
        dailyResult: null,

        // Tools
        toolsAvailable: [{
            instanceId: 'tut-tool',
            type: step.allowedTool,
            used: gameState.history.length > 0 // Tool is used if history exists
        }],
        selectedToolInstanceId: gameState.selectedTool ? 'tut-tool' : null,
        selectedTool: gameState.selectedTool ? 'tut-tool' : null,
        selection: gameState.selection,

        // Metrics
        mood: 'INITIAL',
        compliancePercentage: compliance,
        isResistanceModalOpen: false,
        persistenceLoaded: true,
        startingCompliance: 0,
        isZeroYield: currentYield === 0,
        yieldRatio: 0,
        currentYield: currentYield,

        level: 0,
        levelScore: currentYield,
        totalScore: 0,
        totalOptimalScore: 0,
        optimalScore: optimalScore,
        worstScore: 0,
        movesHistory: [], // Not used for now in tut
        shakeTools: 0,
        detectedMode: null,
        currentSeed: 0,

        resistance: {
            status: ResistanceStatus.INACTIVE,
            isViewOpen: false
        },

        // Tutorial
        tutorialMessage: gameState.selectedTool ? undefined : step.instruction(currentYield, optimalScore, isSuccess)
    } as GameViewModel;


    const interaction: UserInterfaceState = {
        primaryAction: {
            label: currentStepId === 'COMPLETE' ? 'Finish' : (gameState.phase === GamePhase.RESULTS ? (isSuccess ? 'Next Scenario' : 'Retry') : 'Inspect'),
            variant: isSuccess && gameState.phase === GamePhase.RESULTS ? 'gold' : 'neutral',
            Icon: gameState.phase === GamePhase.RESULTS ? (isSuccess ? Play : RotateCcw) : Play,
            onClick: gameState.phase === GamePhase.RESULTS ? (isSuccess ? handleNext : handleRetry) : startInspection,
            disabled: gameState.phase === GamePhase.INSPECTING
        },
        secondaryAction: {
            label: 'Undo',
            variant: 'neutral', // Better color matched to standard Undo
            Icon: RotateCcw,
            onClick: handleUndo,
            disabled: gameState.history.length === 0 || gameState.phase === GamePhase.INSPECTING
        },
        feedback: {
            showAuditBoard: false,
            isBoardDisabled: false,
            allowedIndices: undefined // Allow all interactions
        }
    };

    const actions = {
        handleCardClick,
        handleToolClick,
        handleBackgroundClick: () => setGameState(prev => ({ ...prev, selection: null })),
        changeMode: () => { },
        startInspection,
        retryPractice: () => { },
        retryDaily: () => { },
        resetGame: () => { },
        closeAudit: () => { },
        triggerCurrentAudit: () => { },
        triggerResistance: () => { },
        closeResistance: () => { },
        saveDaily: () => { },
        handleUndo: handleUndo
    };

    return { data, interaction, actions };
}
