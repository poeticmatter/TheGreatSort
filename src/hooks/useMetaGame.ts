import { useState, useEffect, useCallback } from 'react';
import { GameMode, GamePhase } from '../../types'
import { useAnalytics } from './useAnalytics';
import { calculateRelativeEfficiency } from '../utils/gameLogic';

export interface MetaState {
    gameMode: GameMode;
    isGameLoaded: boolean;
    auditState: { date: string; userScore: number } | null;
    resistanceActive: boolean;
    resistancePending: boolean;
}

export interface MetaActions {
    setGameMode: (mode: GameMode) => void;
    setIsGameLoaded: (loaded: boolean) => void;
    setResistancePending: (pending: boolean) => void;
    triggerResistance: () => void;
    closeResistance: () => void;
    triggerCurrentAudit: () => void;
    closeAudit: () => void;
    trackGameStart: (mode: GameMode | string, seed?: number) => void;
    trackGameComplete: (mode: GameMode | string, score: number, optimalScore?: number | null) => void;
}

export function useMetaGame(coreState: any, coreDispatch: any, sessionDate: string) {
    const [gameMode, setGameMode] = useState<GameMode>('DAILY');
    const [isGameLoaded, setIsGameLoaded] = useState(false);
    const [auditState, setAuditState] = useState<{ date: string, userScore: number } | null>(null);
    const [resistanceActive, setResistanceActive] = useState(false);
    const [resistancePending, setResistancePending] = useState(false);

    const { trackGameStart, trackGameComplete, trackDailyAuditViewed } = useAnalytics();

    const triggerResistance = useCallback(() => {
        setResistanceActive(true);
        setAuditState(null);
    }, []);

    const closeResistance = useCallback(() => {
        setResistanceActive(false);
    }, []);

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
                    setResistanceActive(true);
                    setResistancePending(false);
                }, 1000);
                return () => clearTimeout(timer);
            } else {
                setResistancePending(false);
            }
        }
    }, [gameMode, coreState.phase, coreState.optimalScore, coreState.worstScore, coreState.levelScore, resistancePending]);




    return {
        metaState: {
            gameMode,
            isGameLoaded,
            auditState,
            resistanceActive,
            resistancePending,
        },
        metaActions: {
            setGameMode,
            setIsGameLoaded,
            setResistancePending, // Needed by useGame saveDaily wrapper
            triggerResistance,
            closeResistance,
            triggerCurrentAudit,
            closeAudit,
            trackGameStart,
            trackGameComplete // Needed by useGame
        }
    };
}
