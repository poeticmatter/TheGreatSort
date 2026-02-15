import React from 'react';
import { ResistanceLetter } from '../ResistanceLetter';
import { useGameContext } from '../../context/GameContext';
import { useAnalytics } from '../../hooks/useAnalytics';

export function ResistanceView() {
    const { state, dispatch } = useGameContext();
    const { isViewOpen, status, viewVariant } = state.resistance;
    const { trackResistanceJoined } = useAnalytics();

    if (!isViewOpen) return null;

    return (
        <ResistanceLetter
            onClose={() => dispatch({ type: 'CLOSE_RESISTANCE_VIEW' })}
            onJoin={() => trackResistanceJoined()}
            variant={viewVariant}
        />
    );
}
