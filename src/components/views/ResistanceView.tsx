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
    // Use props if they are defined, otherwise fallback. Note that isOpen might be false, so check for undefined.
    const effectiveIsOpen = isOpen !== undefined ? isOpen : (state.resistance?.isViewOpen ?? false);
    const effectiveVariant = variant !== undefined ? variant : (state.resistance?.viewVariant);

    if (!effectiveIsOpen) return null;

    return (
        <ResistanceLetter
            onClose={onClose}
            onJoin={onJoin}
            variant={effectiveVariant}
        />
    );
}
