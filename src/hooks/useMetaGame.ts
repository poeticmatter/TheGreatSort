import { useState, useEffect, useCallback } from 'react';
import { GameMode } from '../../types'
import { useAnalytics } from './useAnalytics';

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
    trackPuzzleStarted: (mode: GameMode) => void;
}

export function useMetaGame(coreState: any, coreDispatch: any, sessionDate: string) {
    // Derive gameMode from coreState, default to DAILY if undefined (during init)
    const gameMode: GameMode = coreState.gameMode || 'DAILY';
    // Derive isGameLoaded from coreState
    const isGameLoaded: boolean = coreState.isLoaded ?? false;

    const [auditState, setAuditState] = useState<{ date: string; userScore: number } | null>(null);

    const { trackPuzzleStarted } = useAnalytics();

    // Sync sessionDate to store if needed
    useEffect(() => {
        if (coreState.sessionDate !== sessionDate) {
            coreDispatch({ type: 'SET_SESSION_DATE', payload: { date: sessionDate } });
        }
    }, [sessionDate, coreState.sessionDate, coreDispatch]);

    const setGameMode = useCallback((mode: GameMode) => {
        coreDispatch({ type: 'SET_GAME_MODE', payload: { mode } });
    }, [coreDispatch]);

    const setIsGameLoaded = useCallback((loaded: boolean) => {
        coreDispatch({ type: 'SET_IS_LOADED', payload: { loaded } });
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
            trackPuzzleStarted,
        }
    };
}
