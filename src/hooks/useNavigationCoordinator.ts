import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameContext } from '../context/GameContext';
import { GameMode } from '../../types';
import { PersistenceService } from '../services/persistence';

export function useNavigationCoordinator() {
    const navigate = useNavigate();
    const location = useLocation();
    const { state, dispatch } = useGameContext();

    // 1. Single source of truth for global unlocks
    const [hasJoinedResistance, setHasJoinedResistance] = useState(() => PersistenceService.loadResistanceStatus());

    // Refresh unlocked status seamlessly on navigation or mode changes
    useEffect(() => {
        setHasJoinedResistance(PersistenceService.loadResistanceStatus());
    }, [state.gameMode, location.pathname]);

    // 2. Identify effective mode based on pure route overriding
    let effectiveGameMode = state.gameMode;
    if (location.pathname === '/tutorial') {
        effectiveGameMode = 'TUTORIAL';
    }

    // 3. Centralized Command Dispatcher for Intent
    const executeNavigationIntent = useCallback((intent: GameMode | 'CAREER') => {
        if (intent === 'CAREER') {
            navigate('/career');
            return;
        }

        if (intent === 'TUTORIAL') {
            navigate('/tutorial');
            return;
        }

        // Must be DAILY or PRACTICE - ensuring we are on root game view
        if (location.pathname !== '/') {
            navigate('/');
        }

        if (state.gameMode !== intent) {
            // Coordinate clean-up operations on the reducer before shifting mode
            dispatch({ type: 'SET_GAME_MODE', payload: { mode: intent } });
            dispatch({ type: 'RESET_STATS' }); // Signals hydration service a fresh load is required
        }
    }, [navigate, location.pathname, state.gameMode, dispatch]);

    const emitLockedResistanceIntent = useCallback(() => {
        dispatch({ type: 'SHOW_LOCKED_RESISTANCE' });
    }, [dispatch]);

    return {
        effectiveMode: effectiveGameMode,
        hasJoinedResistance,
        executeNavigationIntent,
        emitLockedResistanceIntent,
        currentPhase: state.phase
    };
}
