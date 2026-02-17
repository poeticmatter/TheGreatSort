import { useState, useEffect } from 'react';
import { GameHydrationService } from '../services/gameHydrationService';
import { PersistenceService } from '../services/persistence';
import { PuzzleRepository } from '../services/puzzleRepository';
import { useDailyLock } from './useDailyLock';
import { GameState } from '../reducers/gameState';
import { DailyResult } from '../services/persistence/types';
import { GamePhase, GameMode, ResistanceStatus } from '../../types';

export type DailyStatus = 'LOADING' | 'READY';

export function useDailyChallenge(
    sessionDate: string,
    gameState?: GameState,
    gameMode?: GameMode,
    isGameLoaded: boolean = false
) {
    const [status, setStatus] = useState<DailyStatus>('LOADING');
    const [initialConfig, setInitialConfig] = useState<Partial<GameState> | null>(null);
    const [dailyResult, setDailyResult] = useState<DailyResult | null>(null);

    // Lock Logic
    const { isLocked, lockSession } = useDailyLock(sessionDate, () => { });

    // Load Logic
    useEffect(() => {
        const loadDaily = () => {
            // 1. Get Puzzle definition
            const [y, m, d] = sessionDate.split('-').map(Number);
            const puzzleDate = new Date(y, m - 1, d);
            const puzzle = PuzzleRepository.getDailyPuzzle(puzzleDate);

            // 2. Check Persistence
            const savedState = PersistenceService.loadDailyState(sessionDate);
            const savedResult = PersistenceService.getDailyResult(sessionDate);
            const isResistant = PersistenceService.loadResistanceStatus();

            let config: Partial<GameState>;

            if (savedState) {
                const { initialState } = GameHydrationService.hydrateDailyFromSave(savedState, puzzle);
                // Apply Resistance status to saved state if valid
                if (isResistant && initialState.resistance) {
                    initialState.resistance.status = ResistanceStatus.ACTIVE;
                    initialState.gameMode = 'RESISTANCE';
                }
                config = initialState;
            } else if (savedResult) {
                // Completed but no state save found
                const { initialState } = GameHydrationService.hydrateDailyNew(puzzle);
                config = {
                    ...initialState,
                    phase: GamePhase.RESULTS,
                    dailyCompleted: true,
                    levelScore: savedResult.score
                };
                if (isResistant && config.resistance) {
                    config.resistance.status = ResistanceStatus.ACTIVE;
                    config.gameMode = 'RESISTANCE';
                }
            } else {
                // Brand new session
                const { initialState } = GameHydrationService.hydrateResistanceDaily(puzzle, isResistant);
                config = initialState;
            }

            setDailyResult(savedResult);
            setInitialConfig(config);
            setStatus('READY');
        };

        loadDaily();
    }, [sessionDate]);

    // Snapshot Saver
    useEffect(() => {
        if (!isGameLoaded || !gameState || (gameMode !== 'DAILY' && gameMode !== 'RESISTANCE')) return;

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
