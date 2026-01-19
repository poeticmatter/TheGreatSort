import React from 'react';
import Card from './components/Card';
import { GamePhase } from '../types';
import { useGame } from './hooks/useGame';
import { useMusic } from './hooks/useMusic';
import Header from './components/Header';
import Footer from './components/Footer';
import StatusBar from './components/StatusBar';

const getSnakePosition = (index: number): React.CSSProperties => {
  const cycle = Math.floor(index / 12);
  const localIndex = index % 12;
  const baseRow = cycle * 4;
  let col = 0;
  let row = 0;

  if (localIndex < 5) {
    // 0, 1, 2, 3, 4 -> Row 1, Col 1..5
    row = 1;
    col = localIndex + 1;
  } else if (localIndex === 5) {
    // 5 -> Row 2, Col 5
    row = 2;
    col = 5;
  } else if (localIndex < 11) {
    // 6, 7, 8, 9, 10 -> Row 3, Col 5..1
    row = 3;
    col = 11 - localIndex;
  } else {
    // 11 -> Row 4, Col 1
    row = 4;
    col = 1;
  }

  return {
    gridColumn: col,
    gridRow: baseRow + row,
  };
};

const getSnakeDirection = (index: number, total: number): 'right' | 'left' | 'down' | null => {
  if (index >= total - 1) return null; // No arrow for the last item

  const localIndex = index % 12;

  // Row 1: 0, 1, 2, 3 -> Right (4 is end of row)
  if (localIndex < 4) return 'right';

  // End of Row 1: 4 -> Down
  if (localIndex === 4) return 'down';

  // Row 2: 5 -> Down
  if (localIndex === 5) return 'down';

  // Row 3: 6, 7, 8, 9 -> Left (10 is end of row)
  if (localIndex >= 6 && localIndex < 10) return 'left';

  // End of Row 3: 10 -> Down
  if (localIndex === 10) return 'down';

  // Row 4: 11 -> Down
  if (localIndex === 11) return 'down';

  return 'right'; // Fallback
};

export default function TheGreatSort() {
  const { state, actions } = useGame();
  const { isPlaying, toggleMusic } = useMusic();

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
        isPlaying={isPlaying}
        onToggleMusic={toggleMusic}
        onChangeMode={actions.changeMode}
        onShareResult={actions.shareResult}
        onRetryPractice={actions.retryPractice}
      />

      {/* --- MAIN AREA --- */}
      <main
        className="flex-1 flex flex-col items-center p-4 relative overflow-hidden"
        onClick={actions.handleBackgroundClick}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#78350f_1px,transparent_1px)] [background-size:20px_20px]"></div>

        <StatusBar
          phase={state.phase}
          selectedTool={state.selectedTool}
          selection={state.selection}
          detectedMode={state.detectedMode}
          levelScore={state.levelScore}
          optimalScore={state.optimalScore}
          gameMode={state.gameMode}
          onShareResult={actions.shareResult}
          onRetryPractice={actions.retryPractice}
        />

        {/* --- CARDS GRID --- */}
        <div className="flex-1 flex items-center justify-center w-full">
            {state.list.length > 0 ? (
              <div className="grid grid-cols-5 gap-x-7 gap-y-4 justify-items-center sm:flex sm:flex-wrap sm:justify-center sm:items-center sm:gap-6 max-w-5xl px-4 perspective-[1000px]">
                {state.list.map((item, idx) => (
                  <Card
                    key={item.id}
                    item={item}
                    style={getSnakePosition(idx)}
                    mobileDirection={getSnakeDirection(idx, state.list.length)}
                    onClick={actions.handleCardClick}
                    isSelected={state.selection === idx}
                    isTargetCandidate={
                      state.phase === GamePhase.PLANNING &&
                      state.selectedTool === 'swap' &&
                      state.selection !== null &&
                      Math.abs(state.selection - idx) === 1
                    }
                  />
                ))}
              </div>
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

      </main>

      <Footer
        phase={state.phase}
        gameMode={state.gameMode}
        toolsAvailable={state.toolsAvailable}
        selectedTool={state.selectedTool}
        shakeTools={state.shakeTools}
        listLength={state.list.length}
        onToolClick={actions.handleToolClick}
        onActionClick={state.phase === GamePhase.RESULTS ? actions.nextLevel : actions.startInspection}
      />

      {/* Help / Rules Overlay (Desktop Only) */}
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
    </div>
  );
}
