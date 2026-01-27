import React, { useEffect } from 'react';
import { Rows3, Columns3 } from 'lucide-react';
import Card from './components/Card';
import InventoryGrid, { LayoutType } from './components/InventoryGrid';
import { GamePhase } from '../types';
import { useGame } from './hooks/useGame';
import { useDailyLock } from './hooks/useDailyLock';
import { getTodayDateString } from './utils/dateUtils';

import Header from './components/Header';
import Footer from './components/Footer';
import StatusBar from './components/StatusBar';
import AuditWarningModal from './components/AuditWarningModal';
import { DailyAudit } from './components/DailyAudit';
import { ResistanceLetter } from './components/ResistanceLetter';
import { TOOL_REGISTRY } from './tools';

import { GameProvider } from './context/GameContext';

export default function TheGreatSort() {
  return (
    <GameProvider>
       <TheGreatSortContent />
    </GameProvider>
  );
}

function TheGreatSortContent() {
  const { state, actions } = useGame();
  
  // Layout Management with Persistence
  const [layout, setLayout] = React.useState<LayoutType>('HORIZONTAL_STRIP');

  useEffect(() => {
    const saved = localStorage.getItem('preferredLayout') as LayoutType;
    if (saved && (saved === 'VERTICAL_LIST' || saved === 'HORIZONTAL_STRIP')) {
      setLayout(saved);
    }
  }, []);

  const toggleLayout = () => {
    const next = layout === 'HORIZONTAL_STRIP' ? 'VERTICAL_LIST' : 'HORIZONTAL_STRIP';
    setLayout(next);
    localStorage.setItem('preferredLayout', next);
  };
  
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
      <main
        className={`flex-1 flex flex-col items-center p-4 relative ${view === 'game' ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}
        onClick={actions.handleBackgroundClick}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#78350f_1px,transparent_1px)] [background-size:20px_20px]"></div>

        {view === 'resistance' ? (
            <ResistanceLetter onClose={actions.closeResistance} />
        ) : view === 'audit' ? (
           <DailyAudit
              date={state.auditState!.date}
              userHighScore={state.auditState!.userScore}
              onClose={actions.closeAudit}
              onDetectResistance={actions.triggerResistance}
           />
        ) : (
           <>
              <StatusBar
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
                onViewAudit={requestAudit} // Intercept with Lock Request
                isLocked={isLocked}
              />

              {/* --- VIEW TOGGLE --- */}
              <button
                onClick={toggleLayout}
                className="absolute top-4 left-4 z-40 p-2 bg-stone-900/80 border border-stone-700 rounded text-stone-400 hover:text-amber-500 hover:border-amber-500 transition-all shadow-lg backdrop-blur-sm"
                title="Toggle View"
              >
                  {layout === 'VERTICAL_LIST' ? <Rows3 size={20} /> : <Columns3 size={20} />}
              </button>

              {/* --- CARDS GRID --- */}
              <div className="flex-1 flex items-center justify-center w-full">
                  {state.list.length > 0 ? (
                    <InventoryGrid
                      sequence={state.list}
                      selectedIndex={state.selection}
                      candidateIndices={candidateIndices}
                      onItemClick={handleCardClickWrapper}
                      disabled={isGameDisabled}
                      disabledIndices={disabledIndices}
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
           </>
        )}

      </main>

      {view === 'game' && (
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
        />
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
