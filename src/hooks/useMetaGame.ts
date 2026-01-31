import { useState, useEffect, useCallback, useMemo } from 'react';
import { GameMode, GamePhase } from '../../types'
import { useGamePersistence, saveDailyScore, getDailyEntry } from './useGamePersistence';
import { useAnalytics } from './useAnalytics';
import { getTodayDateString } from '../utils/dateUtils';
import { calculateRelativeEfficiency } from '../utils/gameLogic';

export function useMetaGame(coreState: any, coreDispatch: any, sessionDate: string) { // Type coreState properly if possible
    const [gameMode, setGameMode] = useState<GameMode>('DAILY');
    const [isGameLoaded, setIsGameLoaded] = useState(false);
    const [auditState, setAuditState] = useState<{ date: string, userScore: number } | null>(null);
    const [resistanceActive, setResistanceActive] = useState(false);
    const [resistancePending, setResistancePending] = useState(false);

    const { trackGameStart, trackGameComplete, trackDailyAuditViewed } = useAnalytics();

    // --- Persistence ---
    const persistenceState = useMemo(() => ({
        movesHistory: coreState.movesHistory,
        phase: coreState.phase,
        toolsAvailable: coreState.toolsAvailable,
        levelScore: coreState.levelScore,
        optimalScore: coreState.optimalScore,
        worstScore: coreState.worstScore || null,
        list: coreState.list,
        currentSeed: coreState.currentSeed
    }), [coreState]);

    const { loadedState, dailyResult, isLocked } = useGamePersistence(gameMode, persistenceState, isGameLoaded, sessionDate);


    const saveDaily = useCallback(() => {
        saveDailyScore(sessionDate, coreState.levelScore);
        coreDispatch({ type: 'SET_DAILY_COMPLETED', payload: { completed: true } });
        setResistancePending(true);
        trackGameComplete(gameMode, coreState.levelScore, coreState.optimalScore);
    }, [coreState.levelScore, coreState.optimalScore, gameMode, coreDispatch, trackGameComplete, sessionDate]);


    const triggerResistance = useCallback(() => {
        setResistanceActive(true);
        setAuditState(null);
    }, []);

    const closeResistance = useCallback(() => {
        setResistanceActive(false);
        // Dispatch logic handled by orchestrator or here?
        // useGame had logic to Reset Level here if it was a safety net trigger.
        // We might simply expose 'closeResistance' and let the Orchestrator decide what to do (e.g. restart level).
        // But for encapsulation, maybe we Return a signal or just handle the state bit.
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
            loadedState,
            dailyResult,
            isLocked
        },
        metaActions: {
            setGameMode,
            setIsGameLoaded,
            triggerResistance,
            closeResistance,
            triggerCurrentAudit,
            closeAudit,
            saveDaily,
            trackGameStart
        }
    };
}
