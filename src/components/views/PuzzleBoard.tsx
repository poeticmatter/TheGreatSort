import React, { useMemo } from 'react';
import { GamePhase, ResistanceStatus } from '../../../types';
import InventoryGrid, { LayoutType } from '../InventoryGrid';
import Tooltip from '../Tooltip';
import { ComplianceMeter } from '../ComplianceMeter';
import { TrainingScoreDisplay } from '../TrainingScoreDisplay';
import { FlavorText } from '../FlavorText';
import { useGridPresentation } from '../../hooks/useGridPresentation';
import { TOOL_REGISTRY } from '../../tools';
import { useNarrativeSystem } from '../../hooks/useNarrativeSystem';
import { calculateCompliance } from '../../utils/gameLogic';

interface PuzzleBoardProps {
    state: any;
    actions: any;
    layout: LayoutType;
    sidebarContent: React.ReactNode;
    onBackgroundClick: () => void;
    triggerShake: () => void;
    isLocked: boolean;
    onRequestAudit: () => void;
}

export function PuzzleBoard({
    state,
    actions,
    layout,
    sidebarContent,
    onBackgroundClick,
    triggerShake,
    isLocked,
    onRequestAudit
}: PuzzleBoardProps) {

    // --- Helpers ---
    const isCandidate = (idx: number) => {
        if (state.phase !== GamePhase.PLANNING) return false;
        if (state.selection === null) return false;
        if (!state.selectedTool) return false;

        const toolInstance = state.toolsAvailable.find((t: any) => t.instanceId === state.selectedTool);
        if (!toolInstance) return false;

        const strategy = TOOL_REGISTRY[toolInstance.type];
        if (!strategy || !strategy.requiresSelection) return false;

        return strategy.isValid(state.list, idx, state.selection);
    };

    const candidateIndices = useMemo(() =>
        state.list.map((_: any, idx: number) => idx).filter(isCandidate)
        , [state.list, state.phase, state.selection, state.selectedTool]);

    const selectedToolInstance = state.selectedTool ? state.toolsAvailable.find((t: any) => t.instanceId === state.selectedTool) : null;
    const isShieldSelected = selectedToolInstance?.type === 'shield';
    const disabledIndices = isShieldSelected ? [0] : [];

    const handleCardClickWrapper = (item: any) => {
        // Delegate all click logic to the core handler (supports Tile-First)
        actions.handleCardClick(item);
    };

    const gridCards = useGridPresentation({
        sequence: state.list,
        selectedIndex: state.selection,
        candidateIndices: candidateIndices,
        disabledIndices: disabledIndices,
        selectedTool: selectedToolInstance?.type || null,
        highlightIndices: []
    });

    // [ARCHITECTURAL FIX]
    // The UI must respond to the Core Status (Persistent), not the Meta Active flag (Transient Letter).
    // Access nested state safely, as resistance object was refactored.
    const resistanceStatus = state.resistance?.status ?? ResistanceStatus.INACTIVE;
    const isResistanceActive = resistanceStatus !== ResistanceStatus.INACTIVE;

    // Narrative System Hook
    // Encapsulates all flavor text logic, including resistance overrides and determinism.
    const { text: flavorText, mood: flavorMood } = useNarrativeSystem({
        compliancePercentage: state.compliancePercentage,
        resistanceStatus: resistanceStatus,
        projectedResistanceStatus: state.projectedResistanceStatus,
        mood: state.mood,
        daySeed: state.currentSeed
    });

    // Calculate Target Percentage for Resistance Mode
    const targetPercentage = useMemo(() => {
        if (!isResistanceActive || !state.resistance?.targetYield) return undefined;

        return calculateCompliance(
            state.resistance.targetYield,
            state.optimalScore,
            state.worstScore
        );
    }, [isResistanceActive, state.resistance?.targetYield, state.optimalScore, state.worstScore]);

    // Grid Content
    const gridContent = (
        <div className="flex-1 flex items-center justify-center w-full min-h-0">
            {state.list.length > 0 ? (
                <InventoryGrid
                    cards={gridCards}
                    onItemClick={handleCardClickWrapper}
                    disabled={isLocked}
                    layout={layout}
                    showRoles={isResistanceActive}
                />
            ) : (
                state.gameMode === 'DAILY' && state.phase === GamePhase.RESULTS && (
                    <div className="text-stone-600 italic font-serif opacity-50">
                        Daily Quota Fulfilled.
                    </div>
                )
            )}
            {state.list.length === 0 && state.phase === GamePhase.PLANNING && (
                <div className="text-stone-600 italic font-serif animate-pulse">Initializing Sequence...</div>
            )}
        </div>
    );

    if (layout === 'VERTICAL_LIST') {
        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <div className="shrink-0 w-full px-2 pt-2 z-10">
                    <Tooltip
                        phase={state.phase}
                        selectedTool={state.toolsAvailable.find((t: any) => t.instanceId === state.selectedTool)?.type || null}
                        selection={state.selection}
                        detectedMode={state.detectedMode}
                        levelScore={state.levelScore}
                        optimalScore={state.optimalScore}
                        worstScore={state.worstScore}
                        gameMode={state.gameMode}
                        onShareResult={actions.shareResult}
                        onRetryPractice={actions.retryPractice}
                        onViewAudit={onRequestAudit}
                        isLocked={isLocked}
                        isResistanceActive={isResistanceActive}
                        mood={flavorMood}
                    />
                    {state.gameMode !== 'PRACTICE' && <FlavorText mood={flavorMood} text={flavorText} />}
                </div>

                <div className="flex-1 flex flex-row items-stretch justify-center min-h-0 relative">
                    <div className="w-20 flex-none h-full py-4 pl-2 flex flex-col justify-center items-center z-10 pointer-events-none">
                        <div className="pointer-events-auto h-full flex items-center">
                            {state.gameMode === 'PRACTICE' ? (
                                <TrainingScoreDisplay levelScore={state.currentYield ?? 0} optimalScore={state.optimalScore} layout={layout} />
                            ) : (
                                <ComplianceMeter
                                    compliancePercentage={state.compliancePercentage}
                                    targetPercentage={targetPercentage}
                                    layout={layout}
                                />
                            )}
                        </div>
                    </div>

                    <div
                        className="flex-1 min-w-0 h-full overflow-y-auto px-2 custom-scrollbar flex flex-col items-center"
                        onClick={onBackgroundClick}
                    >
                        <div className="flex-1 w-full flex items-center justify-center py-4 min-h-0">
                            {gridContent}
                        </div>
                    </div>

                    <div className="w-20 flex-none h-full py-4 pr-2 flex flex-col items-center justify-center gap-4 border-l border-white/5 bg-black/20 backdrop-blur-sm">
                        {sidebarContent}
                    </div>
                </div>
            </div>
        );
    }

    // Horizontal Layout (HORIZONTAL_STRIP)
    return (
        <main
            className="flex-1 flex flex-col items-center p-4 relative overflow-y-auto custom-scrollbar w-full"
            onClick={onBackgroundClick}
        >
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#78350f_1px,transparent_1px)] [background-size:20px_20px]"></div>

            <div className="w-full relative z-20">
                <Tooltip
                    phase={state.phase}
                    selectedTool={state.toolsAvailable.find((t: any) => t.instanceId === state.selectedTool)?.type || null}
                    selection={state.selection}
                    detectedMode={state.detectedMode}
                    levelScore={state.levelScore}
                    optimalScore={state.optimalScore}
                    worstScore={state.worstScore}
                    gameMode={state.gameMode}
                    onShareResult={actions.shareResult}
                    onRetryPractice={actions.retryPractice}
                    onViewAudit={onRequestAudit}
                    isLocked={isLocked}
                    isResistanceActive={isResistanceActive}
                    mood={flavorMood}
                />
                {state.gameMode !== 'PRACTICE' && <FlavorText mood={flavorMood} text={flavorText} />}
            </div>

            {gridContent}

            {state.gameMode === 'PRACTICE' ? (
                <TrainingScoreDisplay levelScore={state.currentYield ?? 0} optimalScore={state.optimalScore} layout={layout} />
            ) : (
                <ComplianceMeter
                    compliancePercentage={state.compliancePercentage}
                    targetPercentage={targetPercentage}
                    layout={layout}
                />
            )}

        </main>
    );
}
