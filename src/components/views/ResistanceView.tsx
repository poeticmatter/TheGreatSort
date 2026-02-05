import React from 'react';
import { ResistanceLetter } from '../ResistanceLetter';

// Ideally, text content or other state should be passed here or retrieved from context if needed.
// For now, it just renders the letter which might have its own static content or props.
interface ResistanceViewProps {
    onClose: () => void;
    onBackgroundClick: () => void;
}

export function ResistanceView({ onClose, onBackgroundClick }: ResistanceViewProps) {
    return (
        <main className="flex-1 flex flex-col items-center p-4 relative overflow-y-auto custom-scrollbar" onClick={onBackgroundClick}>
            <ResistanceLetter onClose={onClose} />
        </main>
    );
}
