import { useState, useEffect, useCallback } from 'react';
import { GameMode, GamePhase } from '../../types'
import { useAnalytics } from './useAnalytics';
import { calculateRelativeEfficiency } from '../utils/gameLogic';

export interface MetaState {
    gameMode: GameMode;
    isGameLoaded: boolean;
    auditState: { date: string; userScore: number } | null;
}

export interface MetaActions {
    setGameMode: (mode: GameMode) => void;
    setIsGameLoaded: (loaded: boolean) => void;
    triggerCurrentAudit: () => void;
    closeAudit: () => void;
    trackLevelStart: (mode: GameMode | 'DAILY' | 'PRACTICE' | 'RESISTANCE' | string) => void;
}

export function useMetaGame(coreState: any, coreDispatch: any, sessionDate: string) {
    const [gameMode, setGameMode] = useState<GameMode>('DAILY');
    const [isGameLoaded, setIsGameLoaded] = useState(false);
    const [auditState, setAuditState] = useState<{ date: string, userScore: number } | null>(null);

    const { trackLevelStart, trackAuditViewed } = useAnalytics();

    const triggerCurrentAudit = useCallback(() => {
        setAuditState({ date: sessionDate, userScore: coreState.levelScore });
        // trackAuditViewed should be termed "AuditViewed" but the prompt says Daily/Resistance must fire trackAuditViewed when AuditBoard mounts.
        // triggerCurrentAudit shows the board.
        // We can track here OR in the component mount.
        // Prompt says: "src/components/views/AuditBoard.tsx: Inject trackAuditViewed into a useEffect on mount."
        // So we do NOT track here.
    }, [coreState.levelScore, sessionDate]);

    const closeAudit = useCallback(() => {
        setAuditState(null);
    }, []);

    // --- Resistance Auto-Check (Effect) ---





    return {
        metaState: {
            gameMode,
            isGameLoaded,
            auditState,
        },
        metaActions: {
            setGameMode,
            setIsGameLoaded,
            triggerCurrentAudit,
            closeAudit,
            trackLevelStart,
        }
    };
}
