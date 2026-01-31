import React, { useEffect, useState } from 'react';
import { useGame } from './hooks/useGame';
import { useAnalytics } from './hooks/useAnalytics';
import { useDailyLock } from './hooks/useDailyLock';
import { getTodayDateString } from './utils/dateUtils';
import { LayoutType } from './components/InventoryGrid';
import { GameProvider } from './context/GameContext';

import AuditWarningModal from './components/AuditWarningModal';
import { GameView } from './components/views/GameView';
import { ResistanceView } from './components/views/ResistanceView';
import { AuditView } from './components/views/AuditView';

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

  const { state, actions } = useGame(sessionDate);
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

  // --- Daily Lock & Warnings ---
  const {
    isLocked,
    isWarningOpen,
    requestAudit,
    confirmAuditLock,
    cancelAuditLock
  } = useDailyLock(sessionDate, actions.triggerCurrentAudit);

  // --- View Routing ---
  // State Machine logic for View Selection
  const getView = () => {
    if (state.resistanceActive) {
      return (
        <ResistanceView
          onClose={actions.closeResistance}
          onBackgroundClick={actions.handleBackgroundClick}
        />
      );
    }

    if (state.auditState) {
      return (
        <AuditView
          auditState={state.auditState}
          onClose={actions.closeAudit}
          onDetectResistance={actions.triggerResistance}
          onBackgroundClick={actions.handleBackgroundClick}
        />
      );
    }

    return (
      <GameView
        state={state}
        actions={actions}
        isLocked={isLocked}
        onRequestAudit={requestAudit}
        layout={layout}
        onLayoutChange={setLayout}
      />
    );
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-200 font-sans selection:bg-red-500/30 flex flex-col">
      <AuditWarningModal
        isOpen={isWarningOpen}
        onConfirm={confirmAuditLock}
        onCancel={cancelAuditLock}
      />
      {getView()}
    </div>
  );
}
