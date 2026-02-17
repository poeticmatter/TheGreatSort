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
            if (isSuccess) return "Sequence approved. Yield maximized.";
            if (currentYield < targetYield && currentYield > 19) return `Yield falls within acceptable tolerance. Protocol requires maximum yield.`;
            return `Current yield: ${currentYield}. Asset 8 is limiting output.`;
        },
        successCondition: (c, t) => c >= t,
        nextStepId: 'B_INIT'
    },
    'B_INIT': {
        id: 'B_INIT',
        initialList: [6, 5, 12, 3, 14, 2],
        allowedTool: 'swap',
        targetYield: 37,
        description: 'The Pivot',
        instruction: (c, t, isSuccess) => {
            if (isSuccess) return "Ascending protocol engaged. Maximum yield verified.";
            if (c > 16) return "Yield increase noted via ascending protocol. Further optimization required.";
            return "Descending lock active due to value regression (6 > 5). Override to Ascending mode required.";
        },
        successCondition: (c, t) => c >= t,
        nextStepId: 'COMPLETE'
    },
    'COMPLETE': {
        id: 'COMPLETE',
        initialList: [],
        allowedTool: 'sink',
        targetYield: 0,
        description: 'Complete',
        instruction: () => "Training simulation concluded. Report for duty.",
        successCondition: () => false
    }
};
