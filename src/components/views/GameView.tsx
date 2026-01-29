import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { GamePhase } from '../../types';
import InventoryGrid, { LayoutType } from '../InventoryGrid';
import Header from '../Header';
import Footer from '../Footer';
import Tooltip from '../Tooltip';
import { ComplianceMeter } from '../ComplianceMeter';
import { FlavorText } from '../FlavorText';
import ToolBelt from '../ToolBelt';
import SubmitButton from '../SubmitButton';
import { useGridPresentation } from '../../hooks/useGridPresentation';
import { TOOL_REGISTRY } from '../../tools';

interface GameViewProps {
    state: any; // Ideally typed from useGame return type
    actions: any;
    isLocked: boolean; // From DailyLock
    onRequestAudit: () => void;
    onLayoutChange: (layout: LayoutType) => void;
    layout: LayoutType;
}

export function GameView({ state, actions, isLocked, onRequestAudit, layout }: GameViewProps) {

    // --- Visual Feedback ---
    const [isShaking, setIsShaking] = useState(false);
    const triggerShake = useCallback(() => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    }, []);

    useEffect(() => {
        if (state.shakeTools > 0) {
            triggerShake();
        }
    }, [state.shakeTools, triggerShake]);

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

    const isGameDisabled = state.gameMode === 'DAILY' && isLocked;
    const controlsDisabled = isGameDisabled || state.phase !== GamePhase.PLANNING;

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

    // Grid Content
    const gridContent = (
        <div className="flex-1 flex items-center justify-center w-full min-h-0">
            {state.list.length > 0 ? (
                <InventoryGrid
                    cards={gridCards}
                    onItemClick={handleCardClickWrapper}
                    disabled={isGameDisabled}
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

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <Header
                level={state.level}
                levelScore={state.levelScore}
                totalScore={state.totalScore}
                totalOptimalScore={state.totalOptimalScore}
                gameMode={state.gameMode}
                phase={state.phase}
                optimalScore={state.optimalScore}
                detectedMode={state.detectedMode}
                onChangeMode={actions.changeMode}
                onShareResult={actions.shareResult}
                onRetryPractice={actions.retryPractice}
            />

            {layout === 'VERTICAL_LIST' ? (
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
                        <FlavorText mood={state.mood} text={flavorText} />
                    </div>

                    <div className="flex-1 flex flex-row items-stretch justify-center min-h-0 relative">
                        <div className="w-20 flex-none h-full py-4 pl-2 flex flex-col justify-center items-center z-10 pointer-events-none">
                            <div className="pointer-events-auto h-full flex items-center">
                                <ComplianceMeter
                                    compliancePercentage={state.compliancePercentage}
                                    layout={layout}
                                />
                            </div>
                        </div>

                        <div
                            className="flex-1 min-w-0 h-full overflow-y-auto px-2 custom-scrollbar flex flex-col items-center"
                            onClick={actions.handleBackgroundClick}
                        >
                            <div className="flex-1 w-full flex items-center justify-center py-4 min-h-0">
                                {gridContent}
                            </div>
                        </div>

                        <div className="w-20 flex-none h-full py-4 pr-2 flex flex-col items-center justify-center gap-4 border-l border-white/5 bg-black/20 backdrop-blur-sm">
                            <ToolBelt
                                toolsAvailable={state.toolsAvailable}
                                selectedTool={state.selectedTool}
                                shouldShake={isShaking}
                                phase={state.phase}
                                onToolClick={actions.handleToolClick}
                                orientation="vertical"
                                onUndo={actions.handleUndo}
                                canUndo={state.movesHistory.length > 0}
                                isDisabled={controlsDisabled}
                            />
                            <div className="w-8 h-0.5 bg-stone-700 rounded-full opacity-50" />
                            <SubmitButton
                                phase={state.phase}
                                gameMode={state.gameMode}
                                listLength={state.list.length}
                                onActionClick={
                                    state.phase === GamePhase.RESULTS
                                        ? (state.gameMode === 'DAILY'
                                            ? (isLocked ? () => actions.changeMode('PRACTICE') : actions.retryDaily)
                                            : actions.nextLevel)
                                        : actions.startInspection
                                }
                                disabled={isGameDisabled}
                                isLocked={isLocked}
                                compact={true}
                                compliancePercentage={state.compliancePercentage}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <main
                    className="flex-1 flex flex-col items-center p-4 relative overflow-y-auto custom-scrollbar w-full"
                    onClick={actions.handleBackgroundClick}
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
                        <FlavorText mood={state.mood} text={flavorText} />
                    </div>

                    {gridContent}

                    <ComplianceMeter
                        compliancePercentage={state.compliancePercentage}
                        layout={layout}
                    />
                    <Footer
                        phase={state.phase}
                        gameMode={state.gameMode}
                        toolsAvailable={state.toolsAvailable}
                        selectedTool={state.selectedTool}
                        shouldShake={isShaking}
                        listLength={state.list.length}
                        onToolClick={actions.handleToolClick}
                        onUndo={actions.handleUndo}
                        canUndo={state.movesHistory.length > 0}
                        onActionClick={
                            state.phase === GamePhase.RESULTS
                                ? (state.gameMode === 'DAILY'
                                    ? (isLocked ? () => actions.changeMode('PRACTICE') : actions.retryDaily)
                                    : actions.nextLevel)
                                : actions.startInspection
                        }
                        disabled={isGameDisabled}
                        isLocked={isLocked}
                        layout={layout}
                    />

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
            )}
        </div>
    );
}
