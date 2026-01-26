import React from 'react';
import Card from './components/Card';
import SequenceDisplay from './components/SequenceDisplay';
import { GamePhase } from '../types';
import { useGame } from './hooks/useGame';

import Header from './components/Header';
import Footer from './components/Footer';
import StatusBar from './components/StatusBar';
import { DailyAudit } from './components/DailyAudit';
import { getDailyEntry } from './hooks/useGamePersistence';
import { getYesterdayDateString } from './utils/dateUtils';
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

  // Check if audit is available for yesterday
  const isAuditAvailable = !!getDailyEntry(getYesterdayDateString());

  const candidateIndices = state.list.map((_, idx) => idx).filter(isCandidate);
  
  // Route / View State Logic
  const view = state.resistanceActive ? 'resistance' : (state.auditState ? 'audit' : 'game');

  return (
    <div className="min-h-screen bg-stone-900 text-stone-200 font-sans selection:bg-red-500/30 flex flex-col">

      <Header
        level={state.level}
        levelScore={state.levelScore}
        totalScore={state.totalScore}
        totalOptimalScore={state.totalOptimalScore}
        gameMode={state.gameMode}
        phase={state.phase}
        optimalScore={state.optimalScore}
        detectedMode={state.detectedMode}
        isAuditAvailable={isAuditAvailable}
        onChangeMode={actions.changeMode}
        onShareResult={actions.shareResult}
        onRetryPractice={actions.retryPractice}
        onOpenAudit={actions.openAudit}
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
                onViewAudit={actions.triggerCurrentAudit}
              />

              {/* --- CARDS GRID --- */}
              <div className="flex-1 flex items-center justify-center w-full">
                  {state.list.length > 0 ? (
                    <SequenceDisplay
                      sequence={state.list}
                      selectedIndex={state.selection}
                      candidateIndices={candidateIndices}
                      onItemClick={actions.handleCardClick}
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
          shakeTools={state.shakeTools}
          listLength={state.list.length}
          onToolClick={actions.handleToolClick}
          onUndo={actions.handleUndo}
          canUndo={state.movesHistory.length > 0}
          onActionClick={
              state.phase === GamePhase.RESULTS
                ? (state.gameMode === 'DAILY' ? actions.retryDaily : actions.nextLevel)
                : actions.startInspection
          }
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
