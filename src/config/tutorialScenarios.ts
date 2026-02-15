import { ToolType } from '../../types';

export interface TutorialScenario {
    id: string;
    initialList: number[];
    allowedTool: ToolType;
    targetYield: number;
    description: string;
    instruction: (currentYield: number, targetYield: number, isSuccess: boolean) => string;
    nextStepId?: string;
    successCondition: (currentYield: number, targetYield: number) => boolean;
}

export const TUTORIAL_SCENARIOS: Record<string, TutorialScenario> = {
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
