import React, { useEffect, useState } from 'react';
import { useGame } from './hooks/useGame';
import { useAnalytics } from './hooks/useAnalytics';
import { useDailyLock } from './hooks/useDailyLock';
import { useAssetPreloader } from './hooks/useAssetPreloader';
import { getTodayDateString } from './utils/dateUtils';
import { LayoutType } from './components/InventoryGrid';
import { GameProvider } from './context/GameContext';

import { GameView } from './components/views/GameView';
import { ResistanceView } from './components/views/ResistanceView';
import ResistanceLetter from './assets/ResistanceLetter.png';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
const BannersPage = React.lazy(() => import('./components/views/BannersPage'));

function GamePage() {
  return (
    <GameProvider>
      <TheGreatSortContent />
    </GameProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GamePage />} />
        {import.meta.env.DEV && (
          <Route
            path="/banners"
            element={
              <React.Suspense fallback={<div className="p-8 text-stone-400">Loading Banners...</div>}>
                <BannersPage />
              </React.Suspense>
            }
          />
        )}
      </Routes>
    </BrowserRouter>
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
  useAssetPreloader([ResistanceLetter]);

  // --- Daily Lock & Warnings ---
  // Note: useGame/useDailyChallenge now handles locking and audit request logic internally via 'interaction' state.
  // We can rely on data.isLocked if needed.

  // --- View Routing ---
  // State Machine logic for View Selection
  const getView = () => {
    // Audit State is now handled within GameView's orchestration
    return (
      <>
        <GameView
          data={data}
          interaction={interaction}
          actions={actions}
          layout={layout}
          onLayoutChange={setLayout}
        />
        {/* ResistanceView controls its own visibility via Context */}
        <ResistanceView />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-200 font-sans selection:bg-red-500/30 flex flex-col">
      {getView()}
    </div>
  );
}
