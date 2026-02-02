import React, { useMemo } from 'react';
import { GamePhase, ResistanceStatus } from '../../../types';
import InventoryGrid, { LayoutType } from '../InventoryGrid';
import Tooltip from '../Tooltip';
import { ComplianceMeter } from '../ComplianceMeter';
import { ResistanceYield } from '../ResistanceYield';
import { FlavorText } from '../FlavorText';
import { useGridPresentation } from '../../hooks/useGridPresentation';
import { TOOL_REGISTRY } from '../../tools';
import { calculateYields } from '../../utils/gameLogic';

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
        if (!state.selectedTool) {
            triggerShake();
            return;
        }
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

    const flavorText = state.flavorMap ? state.flavorMap[state.mood] : "";

    // Resistance Mode & Yield Calculation
    const isResistanceActive = state.resistanceStatus !== ResistanceStatus.INACTIVE && state.resistanceActive;
    const effectiveVisibleYield = state.visibleYield ?? 0;
    const effectiveTrueYield = state.trueYield ?? 0;

    // Grid Content
    const gridContent = (
        <div className="flex-1 flex items-center justify-center w-full min-h-0">
            {state.list.length > 0 ? (
                <InventoryGrid
                    cards={gridCards}
                    onItemClick={handleCardClickWrapper}
                    disabled={isLocked}
                    layout={layout}
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
                    />
                    {state.gameMode !== 'PRACTICE' && <FlavorText mood={state.mood} text={flavorText} />}
                </div>

                <div className="flex-1 flex flex-row items-stretch justify-center min-h-0 relative">
                    <div className="w-20 flex-none h-full py-4 pl-2 flex flex-col justify-center items-center z-10 pointer-events-none">
                        <div className="pointer-events-auto h-full flex items-center">
                            {isResistanceActive ? (
                                <ResistanceYield
                                    visibleYield={effectiveVisibleYield}
                                    trueYield={effectiveTrueYield}
                                    layout={layout}
                                />
                            ) : (
                                <ComplianceMeter
                                    compliancePercentage={state.compliancePercentage}
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
                />
                {state.gameMode !== 'PRACTICE' && <FlavorText mood={state.mood} text={flavorText} />}
            </div>

            {gridContent}

            {isResistanceActive ? (
                <ResistanceYield
                    visibleYield={effectiveVisibleYield}
                    trueYield={effectiveTrueYield}
                    layout={layout}
                />
            ) : (
                <ComplianceMeter
                    compliancePercentage={state.compliancePercentage}
                    layout={layout}
                />
            )}

            {/* Help / Rules Overlay */}
            <div className="fixed bottom-32 right-6 hidden xl:block pointer-events-none opacity-80">
                <div className="bg-stone-950/90 p-4 rounded-sm border border-stone-700 shadow-2xl backdrop-blur-sm max-w-[200px]">
                    <p className="mb-2 text-amber-600 font-[Cinzel] uppercase tracking-wider text-xs border-b border-stone-800 pb-1">Scoring Protocol</p>
                    <ul className="text-xs text-stone-400 space-y-2 font-[Courier_Prime]">
                        <li><span className="text-amber-500 font-bold">1.</span> First item survives.</li>
                        <li><span className="text-amber-500 font-bold">2.</span> Second item sets Mode (Ascending/Descending).</li>
                        <li><span className="text-amber-500 font-bold">3.</span> Violators are purged.</li>
                        <li><span className="text-amber-500 font-bold">4.</span> Score = Sum of Survivors.</li>
                    </ul>
                </div>
            </div>
        </main>
    );
}
