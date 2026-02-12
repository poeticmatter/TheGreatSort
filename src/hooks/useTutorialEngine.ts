
import { useState, useMemo, useCallback, useEffect } from 'react';
import { CardItem, GamePhase, ToolType, AgentRole, ResistanceStatus } from '../../types';
import { GameViewModel } from '../types/GameViewModel';
import { UserInterfaceState } from './useGameInteractions';
import { Play, RotateCcw } from 'lucide-react';
import { TOOL_REGISTRY } from '../tools';
import { gradeLevel, calculateCompliance } from '../utils/gameLogic';
import { applyMove } from '../utils/gameLogic';

interface TutorialGameState {
    list: CardItem[];
    selection: number | null;
    selectedTool: ToolType | null;
    history: CardItem[][];
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
        initialList: [2, 8, 5, 6, 9],
        allowedTool: 'sink',
        targetYield: 27,
        description: 'The Blocker',
        instruction: (currentYield, targetYield, isSuccess) => {
            if (isSuccess) return "Excellent! The sequence flows correctly. Yield maximized.";
            return `With the 8 blocking the 5 and 6, the yield is ${currentYield}. By using Sink on the 8, you can increase the yield to ${targetYield}.`;
        },
        successCondition: (c, t) => c >= t,
        nextStepId: 'B_INIT'
    },
    'B_INIT': {
        id: 'B_INIT',
        initialList: [10, 2, 12, 13, 14],
        allowedTool: 'sink',
        targetYield: 43, // Placeholder, need to calc
        // 10,2,12,13,14. 
        // 10->2 (Desc). 10,2 accepted (12). 12<2 NO. 13<2 NO. 14<2 NO. Yield = 12?
        // Wait, 10->2 is DESC? 10 > 2.
        // If 10->2, mode is DESC.
        // Next: 12. 12 > 2 (Fail for DESC).
        // If we sink 2 -> 10? Min is 2. [10, 2] -> [2, 2]? 
        // [2, 2, 12, 13, 14].
        // 2->2 (Flat). 2->12 (ASC). 12->13 (ASC). 13->14 (ASC).
        // Yield: 2+2+12+13+14 = 43.
        description: 'The Pivot',
        instruction: (c, t, isSuccess) => {
            if (isSuccess) return "Correct. You fixed the sort direction.";
            return "The 10 -> 2 transition sets a DESCENDING expectation. Sink the 2/10 pair to reset the flow.";
        },
        successCondition: (c, t) => c >= 43, // 43 is likely optimal
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
            history: [] // Reset history on step change
        });
    }, [currentStepId]);

    // Computed State
    const { score: currentYield } = useMemo(() => gradeLevel(gameState.list), [gameState.list]);

    // We assume the target yield in the step generic is the "Optimal" for the tutorial context
    // But we can also calculate real optimal if we want
    // const realOptimal = useMemo(() => findOptimalScore(gameState.list, [{ type: step.allowedTool, instanceId: 'tut', used: false }]), [gameState.list, step.allowedTool]);
    // Allow step to define target for simplicity and narrative control
    const optimalScore = step.targetYield;

    const isSuccess = step.successCondition(currentYield, optimalScore);

    const compliance = calculateCompliance(currentYield, optimalScore, 0);

    // Actions
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
                history: newHistory
            };
        });
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
                    list: newList,
                    selection: null,
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
        list: gameState.list, // Use raw list, no highlighting
        initialList: gameState.list, // Technically initial for this step? Or previous? Using current for now to satisfy type
        phase: GamePhase.PLANNING, // Always planning allowing interaction
        gameMode: 'DAILY', // Use DAILY to show ComplianceMeter
        sessionDate: 'TUTORIAL',
        isLocked: false,
        dailyCompleted: false,
        dailyResult: null,

        // Tools
        toolsAvailable: [{
            instanceId: 'tut-tool',
            type: step.allowedTool,
            used: false // Fix ToolInstance type (uses -> used: boolean)
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
        tutorialMessage: step.instruction(currentYield, optimalScore, isSuccess)
    } as GameViewModel;


    const interaction: UserInterfaceState = {
        primaryAction: {
            label: currentStepId === 'COMPLETE' ? 'Finish' : (isSuccess ? 'Next Scenario' : 'Next'),
            variant: isSuccess ? 'gold' : 'neutral',
            Icon: Play,
            onClick: handleNext,
            disabled: !isSuccess && currentStepId !== 'COMPLETE'
        },
        secondaryAction: {
            label: 'Undo',
            variant: 'neutral', // Better color matched to standard Undo
            Icon: RotateCcw,
            onClick: handleUndo,
            disabled: gameState.history.length === 0
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
        startInspection: () => { },
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
