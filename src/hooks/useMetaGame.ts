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
    trackLevelStart: (mode: GameMode) => void;
}

export function useMetaGame(coreState: any, coreDispatch: any, sessionDate: string) {
    // Derive gameMode from coreState, default to DAILY if undefined (during init)
    const gameMode: GameMode = coreState.gameMode || 'DAILY';

    const [isGameLoaded, setIsGameLoaded] = useState(false);
    const [auditState, setAuditState] = useState<{ date: string; userScore: number } | null>(null);

    const { trackLevelStart, trackAuditViewed } = useAnalytics();

    // Sync sessionDate to store if needed, or just rely on initial state match.
    // Ideally we dispatch SET_SESSION_DATE on mount if they differ?
    useEffect(() => {
        if (coreState.sessionDate !== sessionDate) {
            coreDispatch({ type: 'SET_SESSION_DATE', payload: { date: sessionDate } });
        }
    }, [sessionDate, coreState.sessionDate, coreDispatch]);

    const setGameMode = useCallback((mode: GameMode) => {
        coreDispatch({ type: 'SET_GAME_MODE', payload: { mode } });
    }, [coreDispatch]);

    const triggerCurrentAudit = useCallback(() => {
        setAuditState({ date: sessionDate, userScore: coreState.levelScore });
    }, [coreState.levelScore, sessionDate]);

    const closeAudit = useCallback(() => {
        setAuditState(null);
    }, []);

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
