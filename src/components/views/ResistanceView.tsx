import React from 'react';
import { ResistanceLetter } from '../ResistanceLetter';

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
