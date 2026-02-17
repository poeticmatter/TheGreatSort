import { useState, useEffect } from 'react';
import { GameHydrationService } from '../services/gameHydrationService';
import { PersistenceService } from '../services/persistence';
import { PuzzleRepository } from '../services/puzzleRepository';
import { useDailyLock } from './useDailyLock';
import { GameState } from '../reducers/gameState';
import { DailyResult } from '../services/persistence/types';
import { GamePhase, GameMode } from '../../types';

export type DailyStatus = 'LOADING' | 'READY';

export function useDailyChallenge(
    sessionDate: string,
    gameState?: GameState,
    gameMode?: GameMode,
    isGameLoaded: boolean = false,
    hasUnlockedResistance: boolean = false
) {
    const [status, setStatus] = useState<DailyStatus>('LOADING');
    const [initialConfig, setInitialConfig] = useState<Partial<GameState> | null>(null);
    const [dailyResult, setDailyResult] = useState<DailyResult | null>(null);

    // Lock Logic
    const { isLocked, lockSession } = useDailyLock(sessionDate, () => { });

    // Load Logic
    useEffect(() => {
        // Reset status to ensure we don't serve stale config while loading
        setStatus('LOADING');

        const loadDaily = () => {
            // 1. Get Puzzle definition
            const [y, m, d] = sessionDate.split('-').map(Number);
            const puzzleDate = new Date(y, m - 1, d);
            const puzzle = PuzzleRepository.getDailyPuzzle(puzzleDate);

            // 2. Check Persistence
            const savedState = PersistenceService.loadDailyState(sessionDate);
            const savedResult = PersistenceService.getDailyResult(sessionDate);
            // Use prop instead of loading again, or ensure consistency
            const isResistant = hasUnlockedResistance;

            let config: Partial<GameState>;

            if (savedState) {
                // Pass isResistant directly to hydration service to handle overrides internally
                const { initialState } = GameHydrationService.hydrateDailyFromSave(savedState, puzzle, isResistant);
                config = initialState;
            } else if (savedResult) {
                // Completed but no state save found. Use hydrateResistanceDaily to handle resistance logic consistently.
                const { initialState } = GameHydrationService.hydrateResistanceDaily(puzzle, isResistant);
                config = {
                    ...initialState,
                    phase: GamePhase.RESULTS,
                    dailyCompleted: true,
                    levelScore: savedResult.score
                };
            } else {
                // Brand new session
                const { initialState } = GameHydrationService.hydrateResistanceDaily(puzzle, isResistant);
                config = initialState;
            }

            setDailyResult(savedResult);
            setInitialConfig(config);
            setStatus('READY');
        };

        // Only load if we are in a relevant mode (though pre-loading is fine, re-loading on mode switch is critical)
        loadDaily();
    }, [sessionDate, hasUnlockedResistance, gameMode]);

    // Snapshot Saver
    useEffect(() => {
        if (!isGameLoaded || !gameState || gameMode !== 'DAILY') return;

        // Only save if there's meaningful data (e.g. seed is present)
        if (gameState.currentSeed === undefined) return;

        const phaseToSave = gameState.phase === GamePhase.INSPECTING ? GamePhase.PLANNING : gameState.phase;

        PersistenceService.saveDailyState(sessionDate, {
            puzzleId: gameState.currentSeed,
            moves: gameState.movesHistory,
            snapshot: {
                list: gameState.list,
                tools: gameState.toolsAvailable,
                phase: phaseToSave,
                levelScore: gameState.levelScore
            }
        });
    }, [
        isGameLoaded,
        gameMode,
        sessionDate,
        // Dependencies for saving - specific fields to avoid over-firing if object ref changes
        gameState?.phase,
        gameState?.levelScore,
        gameState?.list,
        gameState?.toolsAvailable,
        gameState?.movesHistory,
        gameState?.currentSeed
    ]);

    const saveDailyResult = (score: number, resistanceStatus?: string) => {
        const result: DailyResult = { score, date: sessionDate, resistanceStatus };
        PersistenceService.saveDailyResult(sessionDate, result);
        PersistenceService.updateDailyHistory(sessionDate, score);
        setDailyResult(result);
        lockSession();
    };

    return {
        status,
        initialConfig,
        dailyResult,
        isLocked,
        saveDailyResult
    };
}
