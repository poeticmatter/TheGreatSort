import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { GamePhase } from '../../../types';
import Header from '../Header';
import Footer from '../Footer';
import ToolBelt from '../ToolBelt';
import SubmitButton from '../SubmitButton';
import { LayoutType } from '../InventoryGrid';
import { PuzzleBoard } from './PuzzleBoard';
import { AuditBoard } from './AuditBoard';

interface GameViewProps {
    core: any;
    meta: any;
    ui: any;
    actions: any;
    layout: LayoutType;
    onLayoutChange: (layout: LayoutType) => void;
}

export function GameView({ core, meta, ui, actions, layout }: GameViewProps) {

    // --- Visual Feedback ---
    const [isShaking, setIsShaking] = useState(false);
    const triggerShake = useCallback(() => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    }, []);

    useEffect(() => {
        if (core.shakeTools > 0) {
            triggerShake();
        }
    }, [core.shakeTools, triggerShake]);

    const isLocked = meta.isLocked;
    const isBoardDisabled = meta.gameMode === 'DAILY' && isLocked;
    const controlsDisabled = isBoardDisabled || core.phase === GamePhase.INSPECTING;

    // Detect if we should show AuditBoard logic
    const showAuditBoard = (meta.gameMode === 'DAILY' && isLocked) || !!meta.auditState;

    // --- ToolBelt Construction ---
    const renderToolBelt = (orientation: 'vertical' | 'horizontal') => (
        <ToolBelt
            toolsAvailable={core.toolsAvailable}
            selectedTool={core.selectedToolInstanceId}
            shouldShake={isShaking}
            phase={core.phase}
            onToolClick={actions.handleToolClick}
            orientation={orientation}
            secondaryAction={ui.secondaryAction}
            isDisabled={controlsDisabled}
        />
    );

    const sidebarContent = useMemo(() => (
        <>
            {renderToolBelt('vertical')}
            <div className="w-8 h-0.5 bg-stone-700 rounded-full opacity-50" />
            <SubmitButton
                label={ui.primaryAction.label}
                variant={ui.primaryAction.variant}
                Icon={ui.primaryAction.Icon}
                onClick={ui.primaryAction.onClick}
                disabled={ui.primaryAction.disabled}
                compact={true}
            />
        </>
    ), [renderToolBelt, ui.primaryAction]);

    // Construct a composite state required by PuzzleBoard
    // PuzzleBoard uses state.list, state.phase, etc.
    const compatibilityState = { ...core, ...meta };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative shell">
            <Header
                level={core.level}
                levelScore={core.levelScore}
                totalScore={core.totalScore}
                totalOptimalScore={core.totalOptimalScore}
                gameMode={meta.gameMode}
                phase={core.phase}
                optimalScore={core.optimalScore}
                detectedMode={core.detectedMode}
                onChangeMode={actions.changeMode}
                onShareResult={actions.shareResult}
                onRetryPractice={actions.retryPractice}
            />

            <div className="flex-1 flex flex-col min-h-0 content-area relative">
                {showAuditBoard ? (
                    <AuditBoard
                        sessionDate={meta.sessionDate}
                        levelScore={core.levelScore}
                        dailyResult={meta.dailyResult}
                        onClose={actions.closeAudit}
                        onDetectResistance={ui.primaryAction.onClick}
                        flavorText={core.flavorMap?.['DONE']}
                    />
                ) : (
                    <PuzzleBoard
                        state={compatibilityState}
                        actions={actions}
                        layout={layout}
                        sidebarContent={sidebarContent}
                        onBackgroundClick={actions.handleBackgroundClick}
                        triggerShake={triggerShake}
                        isLocked={isLocked}
                        onRequestAudit={ui.primaryAction.onClick}
                    />
                )}
            </div>

            {/* Footer handles tools in horizontal layout (only if not audit mode) */}
            {!showAuditBoard && layout === 'HORIZONTAL_STRIP' && (
                <Footer
                    layout={layout}
                    submitConfig={ui.primaryAction}
                    toolBelt={renderToolBelt('horizontal')}
                />
            )}
        </div>
    );
}
