import React, { useEffect } from 'react';
import { Rows3, Columns3 } from 'lucide-react';
import { FlavorKey } from './config/flavorText';
import Card from './components/Card';
import InventoryGrid, { LayoutType } from './components/InventoryGrid';
import { GamePhase } from '../types';
import { useGame } from './hooks/useGame';
import { useAnalytics } from './hooks/useAnalytics';
import { useDailyLock } from './hooks/useDailyLock';
import { getTodayDateString } from './utils/dateUtils';
import { useGridPresentation } from './hooks/useGridPresentation';

import Header from './components/Header';
import Footer from './components/Footer';
import Tooltip from './components/Tooltip';
import AuditWarningModal from './components/AuditWarningModal';
import { DailyAudit } from './components/DailyAudit';
import { ResistanceLetter } from './components/ResistanceLetter';
import { TOOL_REGISTRY } from './tools';

import { GameProvider } from './context/GameContext';
import { ComplianceMeter } from './components/ComplianceMeter';
import { FlavorText } from './components/FlavorText';
import ToolBelt from './components/ToolBelt';
import SubmitButton from './components/SubmitButton';

export default function TheGreatSort() {
  return (
    <GameProvider>
      <TheGreatSortContent />
    </GameProvider>
  );
}

function TheGreatSortContent() {
  const { state, actions } = useGame();
  const { trackPageView } = useAnalytics();

  // Layout Management with Persistence
  // Layout Management (Responsive Automation)
  // Default based on current window width (Mobile First logic: if < 1024, Vertical)
  // But we want VERTICAL_LIST for < 1024, HORIZONTAL_STRIP for >= 1024
  const getResponsiveLayout = () => window.innerWidth < 1024 ? 'VERTICAL_LIST' : 'HORIZONTAL_STRIP';
  const [layout, setLayout] = React.useState<LayoutType>(getResponsiveLayout());

  useEffect(() => {
    trackPageView('/');

    // Resize Listener
    const handleResize = () => {
      setLayout(getResponsiveLayout());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [trackPageView]);

  // Daily Lock Integration
  const today = getTodayDateString();
  const {
    isLocked,
    isWarningOpen,
    requestAudit,
    confirmAuditLock,
    cancelAuditLock
  } = useDailyLock(today, actions.triggerCurrentAudit);


  // Helper to determine if we should highlight candidates
  // Helper to determine if we should highlight candidates
  const isCandidate = (idx: number) => {
    // Basic checks
    if (state.phase !== GamePhase.PLANNING) return false;
    if (state.selection === null) return false;
    if (!state.selectedTool) return false; // Tool ID (instance)

    // Find tool instance
    const toolInstance = state.toolsAvailable.find(t => t.instanceId === state.selectedTool);
    if (!toolInstance) return false;

    // Ask the Strategy: "Is 'idx' a valid second click given 'state.selection' was the first?"
    const strategy = TOOL_REGISTRY[toolInstance.type];
    if (!strategy || !strategy.requiresSelection) return false;

    return strategy.isValid(state.list, idx, state.selection);
  };


  const candidateIndices = state.list.map((_, idx) => idx).filter(isCandidate);

  // Logic to disable specific indices based on tool rules (e.g. Shield cannot target index 0)
  const selectedToolInstance = state.selectedTool ? state.toolsAvailable.find(t => t.instanceId === state.selectedTool) : null;
  const isShieldSelected = selectedToolInstance?.type === 'shield';
  const disabledIndices = isShieldSelected ? [0] : [];

  // Route / View State Logic
  const view = state.resistanceActive ? 'resistance' : (state.auditState ? 'audit' : 'game');

  // Lock condition: Locked only applies to DAILY mode interactions
  // Visual Feedback for Invalid Actions
  const [isShaking, setIsShaking] = React.useState(false);
  const triggerShake = React.useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  }, []);

  // Effect: Shake on Invalid Move Signal from Reducer
  React.useEffect(() => {
    if (state.shakeTools > 0) {
      triggerShake();
    }
  }, [state.shakeTools, triggerShake]);

  const handleCardClickWrapper = (item: any) => {
    // STRICT CHECK: Tool must be selected
    if (!state.selectedTool) {
      triggerShake();
      return;
    }
    actions.handleCardClick(item);
  };

  const isGameDisabled = state.gameMode === 'DAILY' && isLocked;
  const controlsDisabled = isGameDisabled || state.phase !== GamePhase.PLANNING;

  // Prepare cards for presentation
  const gridCards = useGridPresentation({
    sequence: state.list,
    selectedIndex: state.selection,
    candidateIndices: candidateIndices,
    disabledIndices: disabledIndices,
    selectedTool: selectedToolInstance?.type || null,
    highlightIndices: [] // Not actively used in this view but required by hook
  });

  const activeMood: FlavorKey = (!state.selectedTool) ? 'IDLE' : state.mood;
  const flavorText = state.flavorMap ? state.flavorMap[activeMood] : "";

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
    <div className="min-h-screen bg-stone-900 text-stone-200 font-sans selection:bg-red-500/30 flex flex-col">

      <AuditWarningModal
        isOpen={isWarningOpen}
        onConfirm={confirmAuditLock}
        onCancel={cancelAuditLock}
      />

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

      {/* --- MAIN AREA --- */}
      {view === 'resistance' ? (
        <main className="flex-1 flex flex-col items-center p-4 relative overflow-y-auto custom-scrollbar" onClick={actions.handleBackgroundClick}>
          <ResistanceLetter onClose={actions.closeResistance} />
        </main>
      ) : view === 'audit' ? (
        <main className="flex-1 flex flex-col items-center p-4 relative overflow-y-auto custom-scrollbar" onClick={actions.handleBackgroundClick}>
          <DailyAudit
            date={state.auditState!.date}
            userHighScore={state.auditState!.userScore}
            onClose={actions.closeAudit}
            onDetectResistance={actions.triggerResistance}
          />
        </main>
      ) : (
        // GAME VIEW
        layout === 'VERTICAL_LIST' ? (
          // VERTICAL 3-COLUMN LAYOUT
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Status Bar / Tooltip - Top (Above Columns) */}
            <div className="shrink-0 w-full px-2 pt-2 z-10">
              <Tooltip
                phase={state.phase}
                selectedTool={state.toolsAvailable.find(t => t.instanceId === state.selectedTool)?.type || null}
                selection={state.selection}
                detectedMode={state.detectedMode}
                levelScore={state.levelScore}
                optimalScore={state.optimalScore}
                worstScore={state.worstScore}
                gameMode={state.gameMode}
                onShareResult={actions.shareResult}
                onRetryPractice={actions.retryPractice}
                onViewAudit={requestAudit}
                isLocked={isLocked}
              />
              <FlavorText mood={activeMood} text={flavorText} />
            </div>

            {/* 3-Column Area */}
            <div className="flex-1 flex flex-row items-stretch justify-center min-h-0 relative">
              {/* Left: ComplianceMeter (Fixed Width) */}
              <div className="w-20 flex-none h-full py-4 pl-2 flex flex-col justify-center items-center z-10 pointer-events-none">
                <div className="pointer-events-auto h-full flex items-center">
                  <ComplianceMeter
                    compliancePercentage={state.compliancePercentage}
                    layout={layout}
                  />
                </div>
              </div>

              {/* Center: InventoryGrid */}
              <div
                className="flex-1 min-w-0 h-full overflow-y-auto px-2 custom-scrollbar flex flex-col items-center"
                onClick={actions.handleBackgroundClick}
              >
                <div className="flex-1 w-full flex items-center justify-center py-4 min-h-0">
                  {gridContent}
                </div>
              </div>

              {/* Right: Tools & Submit (Fixed Width) */}
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
          // STANDARD LAYOUT
          <main
            className="flex-1 flex flex-col items-center p-4 relative overflow-y-auto custom-scrollbar"
            onClick={actions.handleBackgroundClick}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#78350f_1px,transparent_1px)] [background-size:20px_20px]"></div>

            <div className="w-full relative z-20">
              <Tooltip
                phase={state.phase}
                selectedTool={state.toolsAvailable.find(t => t.instanceId === state.selectedTool)?.type || null}
                selection={state.selection}
                detectedMode={state.detectedMode}
                levelScore={state.levelScore}
                optimalScore={state.optimalScore}
                worstScore={state.worstScore}
                gameMode={state.gameMode}
                onShareResult={actions.shareResult}
                onRetryPractice={actions.retryPractice}
                onViewAudit={requestAudit}
                isLocked={isLocked}
              />
              <FlavorText mood={activeMood} text={flavorText} />
            </div>

            {gridContent}
          </main>
        )
      )}

      {view === 'game' && layout !== 'VERTICAL_LIST' && (
        <>
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
        </>
      )}

      {/* Help / Rules Overlay (Desktop Only - Game Only) */}
      {view === 'game' && (
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
      )}
    </div>
  );
}
