import React, { useMemo } from 'react';
import { GamePhase, ResistanceStatus } from '../../../types';
import InventoryGrid, { LayoutType } from '../InventoryGrid';
import Tooltip from '../Tooltip';
import { ComplianceMeter } from '../ComplianceMeter';
import { TrainingScoreDisplay } from '../TrainingScoreDisplay';
import { FlavorText } from '../FlavorText';
import { useGridPresentation } from '../../hooks/useGridPresentation';
import { TOOL_REGISTRY } from '../../tools';
import { FLAVOR_DATABASE } from '../../config/flavorText';
import { getResistanceFlavor } from '../../utils/resistanceFlavor';

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

    // [ARCHITECTURAL FIX]
    // The UI must respond to the Core Status (Persistent), not the Meta Active flag (Transient Letter).
    // Access nested state safely, as resistance object was refactored.
    const resistanceStatus = state.resistance?.status ?? ResistanceStatus.INACTIVE;
    const isResistanceActive = resistanceStatus !== ResistanceStatus.INACTIVE;

    // Use LIVE projected status if available (from useProjectedMetrics), otherwise fall back to persistent status
    // projectedResistanceStatus is undefined if not in resistance mode or not joined.
    // If it is defined, it gives us the "What if I submitted now" status (e.g. EXPOSED if agent dead).
    const effectiveStatus = state.projectedResistanceStatus ?? resistanceStatus;

    // determine flavor
    const resistanceFlavorKey = isResistanceActive ? getResistanceFlavor(state.compliancePercentage, effectiveStatus) : null;
    const standardFlavor = state.flavorMap ? state.flavorMap[state.mood] : "";

    // If we have a specific resistance flavor key, use it. Otherwise fall back to standard flavor.
    // We need to fetch the text from FLAVOR_DATABASE if it's a resistance key not in the map? 
    // Actually, FLAVOR_DATABASE is static config. state.flavorMap is generated at level start.
    // Resistance flavor isn't "rolled" per level usually, it's deterministic based on state.
    // So we should pick a random one from database on the fly or just display the first one?
    // Let's use a stable hash or just random since it re-renders only on status change ideally.
    // Better: use the daily seed to pick one deterministically if possible, or just index 0 for now.

    // To properly support this, we need to import FLAVOR_DATABASE
    let flavorText = standardFlavor;
    let flavorMood = state.mood;

    if (resistanceFlavorKey) {
        const entries = FLAVOR_DATABASE[resistanceFlavorKey];
        if (entries && entries.length > 0) {
            // Simple deterministic pick based on date/seed if available, or random.
            // Since this runs in render, it must be stable or memoized.
            // Let's use the day + text length as a pseudo-seed to rotate.
            const seed = (state.currentSeed || 0) + (resistanceFlavorKey.length);
            const index = seed % entries.length;
            flavorText = entries[index].text;
            flavorMood = resistanceFlavorKey;
        }
    }

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
                />
                {state.gameMode !== 'PRACTICE' && <FlavorText mood={flavorMood} text={flavorText} />}
            </div>

            {gridContent}

            {state.gameMode === 'PRACTICE' ? (
                <TrainingScoreDisplay levelScore={state.currentYield ?? 0} optimalScore={state.optimalScore} layout={layout} />
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
