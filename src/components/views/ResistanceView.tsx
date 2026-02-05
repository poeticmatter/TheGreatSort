import React from 'react';
import { ResistanceLetter } from '../ResistanceLetter';
import { useGameContext } from '../../context/GameContext';

export function ResistanceView() {
    const { state, dispatch } = useGameContext();
    const { isViewOpen, status } = state.resistance;

    if (!isViewOpen) return null;

    return (
        <ResistanceLetter
            onClose={() => dispatch({ type: 'CLOSE_RESISTANCE_VIEW' })}
        // We can pass status down if ResistanceLetter needs to adapt its message 
        // e.g. status={status} 
        />
    );
}
