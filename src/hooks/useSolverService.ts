import { useEffect, useRef, useState, useCallback } from 'react';
import { CardItem, ToolInstance } from '../../types';
import { PersistenceService } from '../services/persistence';
import { generateLevel, generateTools } from '../utils/gameLogic';

interface SolverState {
    optimalScore: number | null;
    worstScore: number | null;
    isCalculating: boolean;
}

export function useSolverService(
    currentSeed: number | undefined,
    gameMode: string,
    list: CardItem[],
    tools: ToolInstance[]
) {
    const [solverState, setSolverState] = useState<SolverState>({
        optimalScore: null,
        worstScore: null,
        isCalculating: false,
    });

    // Reset state when seed or mode changes to ensure we don't stick to old results
    useEffect(() => {
        setSolverState({
            optimalScore: null,
            worstScore: null,
            isCalculating: false,
        });
    }, [currentSeed, gameMode]);

    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Initialize Worker
        workerRef.current = new Worker(new URL('../workers/gameSolver.worker.ts', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (e) => {
            const { id, optimalScore, worstScore } = e.data;

            // Only accept results for the current seed
            if (id === currentSeed) {
                setSolverState({
                    optimalScore,
                    worstScore: worstScore ?? null,
                    isCalculating: false
                });

                // Cache solution (optimization)
                if (id !== undefined && gameMode === 'DAILY') {
                    PersistenceService.saveSolution(id, { optimalScore, worstScore });
                }
            }
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, [currentSeed, gameMode]); // Re-create worker if seed/mode changes significantly? mostly fine.

    // Trigger Calculation
    const triggerCalculation = useCallback(() => {
        if (list.length > 0 && solverState.optimalScore === null && workerRef.current) {

            // Cache Check
            if (currentSeed !== undefined && gameMode === 'DAILY') {
                const cached = PersistenceService.getSolution(currentSeed);
                if (cached) {
                    setSolverState({
                        optimalScore: cached.optimalScore,
                        worstScore: cached.worstScore ?? null,
                        isCalculating: false
                    });
                    return;
                }
            }

            const mode = (gameMode === 'DAILY' || gameMode === 'RESULTS') ? 'BOTH' : 'OPTIMAL';
            setSolverState(prev => ({ ...prev, isCalculating: true }));

            // Logic to regenerate clean level if we need to pass strict params?
            // useGame passed state.list. If list is mutated, solver might need original. 
            // But solver generates its own level from seed usually? 
            // useGame.ts: 385: if (state.currentSeed !== undefined) { listToSolve = generateLevel... }
            // So we should pass seed if available.

            // We'll pass the list/tools as props to this hook, but purely rely on seed for reconstruction if possible.
            // But wait, the hook props `list` and `tools` might be the modified ones?
            // useGame logic: 
            // if (state.currentSeed !== undefined) { listToSolve = generateLevel... } else { listToSolve = state.list }

            let listToSolve = list;
            let toolsToSolve = tools;

            if (currentSeed !== undefined) {
                listToSolve = generateLevel(9, currentSeed);
                toolsToSolve = generateTools(currentSeed);
            }

            workerRef.current.postMessage({
                mode,
                id: currentSeed,
                list: listToSolve,
                tools: toolsToSolve
            });
        }
    }, [list, tools, currentSeed, gameMode, solverState.optimalScore]);

    // Auto-trigger when dependencies change (like new level start)
    useEffect(() => {
        triggerCalculation();
    }, [triggerCalculation]);

    return solverState;
}
