import React, { useEffect, useState } from 'react';
import { useGame } from './hooks/useGame';
import { useAssetPreloader } from './hooks/useAssetPreloader';
import { LayoutType } from './components/InventoryGrid';
import { GameProvider, useGameContext } from './context/GameContext';

import { GameView } from './components/views/GameView';
import ResistanceLetter from './assets/ResistanceLetter.png';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnalyticsTracker } from './components/AnalyticsTracker';
import { TutorialPage } from './components/views/TutorialPage';
const BannersPage = React.lazy(() => import('./components/views/BannersPage'));

function GamePage() {
  return (
    <TheGreatSortContent />
  );
}

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <AnalyticsTracker />
        <Routes>
          <Route path="/" element={<GamePage />} />
          <Route path="/tutorial" element={<TutorialPage />} />
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
    </GameProvider>
  );
}

function TheGreatSortContent() {
  // Get session date from Context instead of local state
  const { state } = useGameContext();
  const sessionDate = state.sessionDate;

  const { data, interaction, actions } = useGame(sessionDate);

  // --- Layout Management ---
  const getResponsiveLayout = (): LayoutType => window.innerWidth < 1024 ? 'VERTICAL_LIST' : 'HORIZONTAL_STRIP';
  const [layout, setLayout] = useState<LayoutType>(getResponsiveLayout());

  useEffect(() => {
    const handleResize = () => setLayout(getResponsiveLayout());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      </>
    );
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-200 font-sans selection:bg-red-500/30 flex flex-col">
      {getView()}
    </div>
  );
}
