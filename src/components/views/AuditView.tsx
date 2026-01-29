import React from 'react';
import { DailyAudit } from '../DailyAudit';

interface AuditViewProps {
    auditState: { date: string, userScore: number };
    onClose: () => void;
    onDetectResistance: () => void;
    onBackgroundClick: () => void;
}

export function AuditView({ auditState, onClose, onDetectResistance, onBackgroundClick }: AuditViewProps) {
    return (
        <main className="flex-1 flex flex-col items-center p-4 relative overflow-y-auto custom-scrollbar" onClick={onBackgroundClick}>
            <DailyAudit
                date={auditState.date}
                userHighScore={auditState.userScore}
                onClose={onClose}
                onDetectResistance={onDetectResistance}
            />
        </main>
    );
}
