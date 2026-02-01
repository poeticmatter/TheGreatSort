import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Play, Repeat, RotateCcw } from 'lucide-react';
import { getSubmitButtonConfig } from '../../config/submitButtonConfig';
import { GamePhase } from '../../../types';
import Header from '../Header';
import Footer from '../Footer';
import ToolBelt from '../ToolBelt';
import SubmitButton from '../SubmitButton';
import { LayoutType } from '../InventoryGrid';
import { PuzzleBoard } from './PuzzleBoard';
import { AuditBoard } from './AuditBoard';

interface GameViewProps {
    state: any; // Ideally typed from useGame return type
    actions: any;
    isLocked: boolean; // From DailyLock
    onRequestAudit: () => void;
    onLayoutChange: (layout: LayoutType) => void;
    layout: LayoutType;
    onForfeit: () => void;
}

export function GameView({ state, actions, isLocked, onRequestAudit, layout, onForfeit }: GameViewProps) {

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

    const isBoardDisabled = state.gameMode === 'DAILY' && isLocked;

    // --- Main Button Configuration (Submit / Next / Audit) ---
    const buttonConfig = useMemo(() => {
        if (state.gameMode === 'DAILY' && isLocked) {
            return { label: 'Training', variant: 'destructive' as const, Icon: Play, onClick: () => actions.changeMode('PRACTICE') };
        }

        if (state.phase === GamePhase.RESULTS) {
            if (state.gameMode === 'DAILY') {
                // Provisional Results Phase: User must explictly commit
                return {
                    label: 'View Audit',
                    variant: 'warning' as const,
                    Icon: Play,
                    onClick: () => {
                        actions.saveDaily();
                        onRequestAudit(); // Lock the session
                        actions.triggerCurrentAudit();
                    }
                };
            } else {
                return { label: 'Next Level', variant: 'warning' as const, Icon: Play, onClick: actions.nextLevel };
            }
        }

        // Planning Phase
        const config = getSubmitButtonConfig(state.mood);
        const onClick = actions.startInspection;

        return { ...config, onClick };
    }, [state.phase, state.gameMode, state.mood, state.compliancePercentage, isLocked, actions, onRequestAudit, onForfeit]);

    // --- Secondary Button Configuration (Undo / Retry) ---
    const secondaryConfig = useMemo(() => {
        // Daily Results Phase: Retry Button
        if (state.gameMode === 'DAILY' && state.phase === GamePhase.RESULTS && !isLocked) {
            const isPerfect = state.compliancePercentage >= 100 || state.optimalScore === state.levelScore;

            return {
                label: 'RETRY',
                variant: (isPerfect ? 'muted' : 'default') as 'muted' | 'default',
                Icon: Repeat,
                onClick: actions.retryDaily,
                disabled: false
            };
        }

        // Default: Undo Button
        return {
            label: 'UNDO',
            variant: 'default' as const,
            Icon: RotateCcw,
            onClick: actions.handleUndo,
            disabled: state.movesHistory.length === 0 || isLocked || state.phase === GamePhase.INSPECTING
        };
    }, [state.gameMode, state.phase, isLocked, state.compliancePercentage, state.optimalScore, state.levelScore, actions, state.movesHistory.length]);

    const isSubmitDisabled = (isBoardDisabled && buttonConfig.label !== 'Training') || state.phase === GamePhase.INSPECTING;
    // We only global-disable the ToolBelt container if the board is locked or we are inspecting.
    // In RESULTS phase, we want it enabled so the "Retry" button (which lives in ToolBelt) can be clicked.
    // Individual tools will self-disable based on the phase != PLANNING check inside ToolBelt.
    const controlsDisabled = isBoardDisabled || state.phase === GamePhase.INSPECTING;

    // Detect if we should show AuditBoard logic
    // Logic: If Locked DAILY mode OR if auditState is present
    const showAuditBoard = (state.gameMode === 'DAILY' && isLocked) || !!state.auditState;

    // --- ToolBelt Construction ---
    // We construct it here to pass to either PuzzleBoard (Sidebar) or Footer (Horizontal)
    // Note: In vertical mode, ToolBelt is passed via sidebarContent to PuzzleBoard
    // In horizontal mode, it sits in Footer.

    const renderToolBelt = (orientation: 'vertical' | 'horizontal') => (
        <ToolBelt
            toolsAvailable={state.toolsAvailable}
            selectedTool={state.selectedTool}
            shouldShake={isShaking}
            phase={state.phase}
            onToolClick={actions.handleToolClick}
            orientation={orientation}
            secondaryAction={secondaryConfig}
            isDisabled={controlsDisabled}
        />
    );

    const sidebarContent = useMemo(() => (
        <>
            {renderToolBelt('vertical')}
            <div className="w-8 h-0.5 bg-stone-700 rounded-full opacity-50" />
            <SubmitButton
                label={buttonConfig.label}
                variant={buttonConfig.variant}
                Icon={buttonConfig.Icon}
                onClick={buttonConfig.onClick}
                disabled={isSubmitDisabled}
                compact={true}
            />
        </>
    ), [renderToolBelt, buttonConfig, isSubmitDisabled]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative shell">
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

            <div className="flex-1 flex flex-col min-h-0 content-area relative">
                {showAuditBoard ? (
                    <AuditBoard
                        sessionDate={state.sessionDate}
                        levelScore={state.levelScore}
                        dailyResult={state.dailyResult}
                        onClose={actions.closeAudit}
                        onDetectResistance={onRequestAudit}
                        flavorText={state.flavorMap?.['DONE']}
                    />
                ) : (
                    <PuzzleBoard
                        state={state}
                        actions={actions}
                        layout={layout}
                        sidebarContent={sidebarContent}
                        onBackgroundClick={actions.handleBackgroundClick}
                        triggerShake={triggerShake}
                        isLocked={isLocked}
                        onRequestAudit={onRequestAudit}
                    />
                )}
            </div>

            {/* Footer handles tools in horizontal layout (only if not audit mode) */}
            {!showAuditBoard && layout === 'HORIZONTAL_STRIP' && (
                <Footer
                    layout={layout}
                    submitConfig={{ ...buttonConfig, disabled: isSubmitDisabled }}
                    toolBelt={renderToolBelt('horizontal')}
                />
            )}
        </div>
    );
}
