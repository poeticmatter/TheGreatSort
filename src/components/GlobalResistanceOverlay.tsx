import React, { useCallback } from 'react';
import { useGameContext } from '../context/GameContext';
import { useNavigationCoordinator } from '../hooks/useNavigationCoordinator';
import { ResistanceView } from './views/ResistanceView';
import { PersistenceService } from '../services/persistence';
import { useAnalytics } from '../hooks/useAnalytics';

export const GlobalResistanceOverlay: React.FC = () => {
    const { state, dispatch } = useGameContext();
    const { executeNavigationIntent } = useNavigationCoordinator();
    const { trackResistanceJoined } = useAnalytics();

    const handleJoin = useCallback(() => {
        dispatch({ type: 'ACTIVATE_RESISTANCE' });
        PersistenceService.saveResistanceStatus(true);
        trackResistanceJoined(state.gameMode);
        executeNavigationIntent('DAILY');
    }, [dispatch, trackResistanceJoined, state.gameMode, executeNavigationIntent]);

    const handleClose = useCallback((accepted: boolean) => {
        if (accepted) {
            handleJoin();
        } else {
            dispatch({ type: 'CLOSE_RESISTANCE_VIEW' });
        }
    }, [dispatch, handleJoin]);

    return (
        <ResistanceView
            isOpen={state.resistance.isViewOpen}
            variant={state.resistance.viewVariant}
            onJoin={handleJoin}
            onClose={handleClose}
        />
    );
};
