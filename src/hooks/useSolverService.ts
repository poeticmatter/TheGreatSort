import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CardItem, ToolInstance } from '../../types';
import { PersistenceService } from '../services/persistence';
import { generateLevel, generateTools } from '../utils/gameLogic';
import { GameAction } from '../reducers/gameState';

interface SolverState {
    optimalScore: number | null;
    worstScore: number | null;
    isCalculating: boolean;
}

export function useSolverService(
    currentSeed: number | undefined,
    gameMode: string,
    list: CardItem[],
    tools: ToolInstance[],
    existingOptimal: number | null = null,
    existingWorst: number | null = null,
    dispatch?: React.Dispatch<GameAction> // Optional for backward compatibility if needed, but we will pass it
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
        // Optimization: If scores are already provided (e.g. from static Daily data), skip calculation
        // BUT: For Practice mode, always recalculate since we can't trust cached scores
        if (gameMode !== 'PRACTICE' && existingOptimal !== null && existingWorst !== null) {
            setSolverState({
                optimalScore: existingOptimal,
                worstScore: existingWorst,
                isCalculating: false
            });
            return;
        }

        if (list.length > 0 && solverState.optimalScore === null && workerRef.current) {

            // Cache Check (Daily mode only)
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

            // Regenerate clean initial state from seed for solver
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
    }, [list, tools, currentSeed, gameMode, solverState.optimalScore, existingOptimal, existingWorst]);

    // Auto-trigger when dependencies change (like new level start)
    useEffect(() => {
        triggerCalculation();
    }, [triggerCalculation]);

    // Sync Scores Logic (moved from useGame)
    useEffect(() => {
        if (gameMode === 'PRACTICE' && dispatch) {
            if (solverState.optimalScore !== null && existingOptimal === null) {
                dispatch({ type: 'SET_OPTIMAL_SCORE', payload: { score: solverState.optimalScore } });
            }
            if (solverState.worstScore !== null && existingWorst === null) {
                dispatch({ type: 'SET_WORST_SCORE', payload: { score: solverState.worstScore } });
            }
        }
    }, [solverState.optimalScore, solverState.worstScore, existingOptimal, existingWorst, dispatch, gameMode]);

    return solverState;
}
