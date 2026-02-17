import { GameState } from '../reducers/gameState';
import { GameViewModel } from '../types/GameViewModel';
import { MetaState } from '../hooks/useMetaGame';
import { SystemMood } from '../hooks/useSystemMood';

export interface ViewModelContext {
    sessionDate: string;
    isLocked: boolean;
    dailyResult: any;
    persistenceLoaded: boolean;
    isResistanceModalOpen: boolean;
    mood: SystemMood;
    // Metrics
    compliancePercentage: number;
    startingCompliance: number;
    isZeroYield: boolean;
    yieldRatio: number;
    currentYield: number;
    projectedResistanceStatus?: any;
    hasJoinedResistance: boolean;
    // Tutorial overrides
    allowedIndices?: number[];
    tutorialMessage?: string;
}

export function transformToViewModel(
    coreState: GameState,
    metaState: Pick<MetaState, 'gameMode'>,
    context: ViewModelContext
): GameViewModel {
    return {
        ...coreState,
        // Meta Overrides
        gameMode: metaState.gameMode,
        sessionDate: context.sessionDate,

        // Context
        isLocked: context.isLocked,
        dailyResult: context.dailyResult,
        persistenceLoaded: context.persistenceLoaded,
        isResistanceModalOpen: context.isResistanceModalOpen,
        mood: context.mood,

        // Metrics
        compliancePercentage: context.compliancePercentage,
        startingCompliance: context.startingCompliance,
        isZeroYield: context.isZeroYield,
        yieldRatio: context.yieldRatio,
        hasJoinedResistance: context.hasJoinedResistance,
        // currentYield is passed but not strictly in GameViewModel interface, extending GameState usually covers score but currentYield might be transient
        // effectively duck-typed

        // Aliases
        selectedTool: coreState.selectedToolInstanceId,

        // Tutorial
        allowedIndices: context.allowedIndices,
        tutorialMessage: context.tutorialMessage
    } as GameViewModel;
}
