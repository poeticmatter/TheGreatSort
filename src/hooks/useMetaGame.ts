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
    trackGameStart: (mode: GameMode | string, seed?: number) => void;
    trackGameComplete: (mode: GameMode | string, score: number, optimalScore: number | null | undefined, efficiency: number) => void;
}

export function useMetaGame(coreState: any, coreDispatch: any, sessionDate: string) {
    const [gameMode, setGameMode] = useState<GameMode>('DAILY');
    const [isGameLoaded, setIsGameLoaded] = useState(false);
    const [auditState, setAuditState] = useState<{ date: string, userScore: number } | null>(null);

    const { trackGameStart, trackGameComplete, trackDailyAuditViewed } = useAnalytics();

    const triggerCurrentAudit = useCallback(() => {
        setAuditState({ date: sessionDate, userScore: coreState.levelScore });
        trackDailyAuditViewed(sessionDate, 'passed');
    }, [coreState.levelScore, trackDailyAuditViewed, sessionDate]);

    const closeAudit = useCallback(() => {
        setAuditState(null);
    }, []);

    // --- Resistance Auto-Check (Effect) ---
    useEffect(() => {
        // Efficiency Check (Results Phase)
        const resistancePending = coreState.resistance?.isPending;

        if (gameMode === 'DAILY' &&
            coreState.phase === GamePhase.RESULTS &&
            coreState.optimalScore !== null &&
            coreState.worstScore !== null &&
            resistancePending) {

            const efficiency = calculateRelativeEfficiency(
                coreState.levelScore,
                coreState.optimalScore,
                coreState.worstScore
            );

            if (efficiency === 0) {
                const timer = setTimeout(() => {
                    coreDispatch({ type: 'ACTIVATE_RESISTANCE' }); // Auto trigger
                    coreDispatch({ type: 'SET_RESISTANCE_PENDING', payload: { pending: false } });
                }, 1000);
                return () => clearTimeout(timer);
            } else {
                coreDispatch({ type: 'SET_RESISTANCE_PENDING', payload: { pending: false } });
            }
        }
    }, [gameMode, coreState.phase, coreState.optimalScore, coreState.worstScore, coreState.levelScore, coreState.resistance, coreDispatch]);




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
            trackGameStart,
            trackGameComplete // Needed by useGame
        }
    };
}
