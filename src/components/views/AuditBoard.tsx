import React from 'react';
import { DailyAudit } from '../DailyAudit';

interface AuditBoardProps {
    sessionDate: string;
    levelScore: number;
    dailyResult: any;
    onClose: () => void;
    onDetectResistance: () => void;
    flavorText: string;
}

export function AuditBoard({ sessionDate, levelScore, dailyResult, onClose, onDetectResistance, flavorText }: AuditBoardProps) {
    return (
        <div className="flex-1 flex items-center justify-center w-full min-h-0 p-6">
            <DailyAudit
                date={sessionDate}
                userHighScore={dailyResult?.score || levelScore}
                onClose={onClose}
                onDetectResistance={onDetectResistance}
                flavorText={flavorText}
            />
        </div>
    );
}
