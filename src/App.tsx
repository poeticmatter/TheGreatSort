import React, { useEffect, useState } from 'react';
import { useGame } from './hooks/useGame';
import { useAnalytics } from './hooks/useAnalytics';
import { useDailyLock } from './hooks/useDailyLock';
import { getTodayDateString } from './utils/dateUtils';
import { LayoutType } from './components/InventoryGrid';
import { GameProvider } from './context/GameContext';

import { GameView } from './components/views/GameView';
import { ResistanceView } from './components/views/ResistanceView';
import ResistanceLetter from './assets/ResistanceLetter.png';

export default function TheGreatSort() {
  return (
    <GameProvider>
      <TheGreatSortContent />
    </GameProvider>
  );
}

function TheGreatSortContent() {
  // Capture session date once on mount
  const [sessionDate] = useState(() => getTodayDateString());

  const { data, interaction, actions } = useGame(sessionDate);
  const { trackPageView } = useAnalytics();

  // --- Layout Management ---
  const getResponsiveLayout = (): LayoutType => window.innerWidth < 1024 ? 'VERTICAL_LIST' : 'HORIZONTAL_STRIP';
  const [layout, setLayout] = useState<LayoutType>(getResponsiveLayout());

  useEffect(() => {
    trackPageView('/');
    const handleResize = () => setLayout(getResponsiveLayout());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [trackPageView]);

  // --- Asset Preloading (Deferred) ---
  useEffect(() => {
    const timer = setTimeout(() => {
      const img = new Image();
      img.src = ResistanceLetter;
      img.decode()
        .then(() => {
          // Preload success - fire and forget
        })
        .catch((e) => {
          // Preload failed - silent fail
          // console.warn('Failed to preload Resistance Letter:', e);
        });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // --- Daily Lock & Warnings ---
  // Note: useGame/useDailyChallenge now handles locking and audit request logic internally via 'interaction' state.
  // We can rely on data.isLocked if needed.

  // --- View Routing ---
  // State Machine logic for View Selection
  const getView = () => {
    if (data.resistanceActive) {
      return (
        <ResistanceView
          onClose={actions.closeResistance}
          onBackgroundClick={actions.handleBackgroundClick}
        />
      );
    }

    // Audit State is now handled within GameView's orchestration

    return (
      <GameView
        data={data}
        interaction={interaction}
        actions={actions}
        layout={layout}
        onLayoutChange={setLayout}
      />
    );
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-200 font-sans selection:bg-red-500/30 flex flex-col">
      {getView()}
    </div>
  );
}
