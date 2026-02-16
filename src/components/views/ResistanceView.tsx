import React from 'react';
import { ResistanceLetter } from '../ResistanceLetter';
import { useGameContext } from '../../context/GameContext';

interface ResistanceViewProps {
    onClose: (accepted: boolean) => void;
    onJoin: () => void;
    isOpen?: boolean;
    variant?: 'INVITE' | 'LOCKED';
}


export function ResistanceView({ onClose, onJoin, isOpen, variant }: ResistanceViewProps) {
    const { state } = useGameContext();

    // Use props if provided (Tutorial), otherwise fall back to context (Main Game - though Main Game also passes props now via GameView)
    // Actually, since GameView always has data, we can prefer props.
    // If prop is undefined, fall back.
    const effectiveIsOpen = isOpen ?? state.resistance.isViewOpen;
    const effectiveVariant = variant ?? state.resistance.viewVariant;

    if (!effectiveIsOpen) return null;

    return (
        <ResistanceLetter
            onClose={onClose}
            onJoin={onJoin}
            variant={effectiveVariant}
        />
    );
}
