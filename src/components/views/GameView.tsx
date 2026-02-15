import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Header from '../Header';
import Footer from '../Footer';
import ToolBelt from '../ToolBelt';
import SubmitButton from '../SubmitButton';
import { LayoutType } from '../InventoryGrid';
import { PuzzleBoard } from './PuzzleBoard';
import { AuditBoard } from './AuditBoard';
import { UserInterfaceState } from '../../hooks/useGameInteractions';
import RulesModal from '../RulesModal';

import { GameViewModel } from '../../types/GameViewModel';

interface GameViewProps {
    data: GameViewModel;
    interaction: UserInterfaceState;
    actions: any;
    layout: LayoutType;
    onLayoutChange: (layout: LayoutType) => void;
}

export function GameView({ data, interaction, actions, layout }: GameViewProps) {
    const { primaryAction, secondaryAction, feedback } = interaction;
    const [isRulesOpen, setIsRulesOpen] = useState(false);

    // Initial check for rules
    useEffect(() => {
        const seen = localStorage.getItem('tgs_seen_rules');
        if (!seen) {
            setIsRulesOpen(true);
        }
    }, []);

    const handleCloseRules = useCallback(() => {
        setIsRulesOpen(false);
        localStorage.setItem('tgs_seen_rules', 'true');
    }, []);

    const handleOpenRules = useCallback(() => {
        setIsRulesOpen(true);
    }, []);

    // --- Visual Feedback ---
    const [isShaking, setIsShaking] = useState(false);
    const triggerShake = useCallback(() => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    }, []);

    useEffect(() => {
        if (data.shakeTools > 0) {
            triggerShake();
        }
    }, [data.shakeTools, triggerShake]);

    // --- ToolBelt Construction ---
    const renderToolBelt = (orientation: 'vertical' | 'horizontal') => (
        <ToolBelt
            toolsAvailable={data.toolsAvailable}
            selectedTool={data.selectedToolInstanceId}
            shouldShake={isShaking}
            phase={data.phase}
            onToolClick={actions.handleToolClick}
            orientation={orientation}
            secondaryAction={secondaryAction || undefined}
            isDisabled={feedback.isBoardDisabled}
        />
    );

    const sidebarContent = useMemo(() => (
        <>
            {renderToolBelt('vertical')}
            <div className="w-8 h-0.5 bg-stone-700 rounded-full opacity-50" />
            <SubmitButton
                label={primaryAction.label}
                variant={primaryAction.variant}
                Icon={primaryAction.Icon}
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                compact={true}
            />
        </>
    ), [renderToolBelt, primaryAction]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative shell">
            <Header
                level={data.level}
                levelScore={data.levelScore}
                totalScore={data.totalScore}
                totalOptimalScore={data.totalOptimalScore}
                gameMode={data.gameMode}
                phase={data.phase}
                optimalScore={data.optimalScore}
                detectedMode={data.detectedMode}
                onChangeMode={actions.changeMode}


                onOpenRules={handleOpenRules}
            />

            <RulesModal isOpen={isRulesOpen} onClose={handleCloseRules} />

            <div className="flex-1 flex flex-col min-h-0 content-area relative">
                {feedback.showAuditBoard ? (
                    <AuditBoard
                        sessionDate={data.sessionDate}
                        levelScore={data.levelScore}
                        dailyResult={data.dailyResult}
                        onClose={actions.closeAudit}
                        onDetectResistance={primaryAction.onClick}
                        flavorText={data.flavorMap?.['DONE']}
                        optimalScore={data.optimalScore}
                        gameMode={data.gameMode}
                        trackShare={actions.trackShare}
                    />
                ) : (
                    <PuzzleBoard
                        state={data}
                        actions={actions}
                        layout={layout}
                        sidebarContent={sidebarContent}
                        onBackgroundClick={actions.handleBackgroundClick}
                        triggerShake={triggerShake}
                        isLocked={data.isLocked}
                        onRequestAudit={primaryAction.onClick}
                    />
                )}
            </div>

            {/* Footer handles tools in horizontal layout (only if not audit mode) */}
            {!feedback.showAuditBoard && layout === 'HORIZONTAL_STRIP' && (
                <Footer
                    layout={layout}
                    submitConfig={primaryAction}
                    toolBelt={renderToolBelt('horizontal')}
                />
            )}
        </div>
    );
}
