import React, { useEffect } from 'react';
import { DailyAudit } from '../DailyAudit';
import { useAnalytics } from '../../hooks/useAnalytics';
import { PersistenceService } from '../../services/persistence';
import { GameMode } from '../../../types';

interface AuditBoardProps {
    sessionDate: string;
    levelScore: number;
    dailyResult: any;
    onClose: () => void;
    onDetectResistance: () => void;
    flavorText: string;
    optimalScore: number | null;
    gameMode: GameMode;
    trackShare: (context: string, mode: GameMode) => void;
}

export function AuditBoard({ sessionDate, levelScore, dailyResult, onClose, onDetectResistance, flavorText, optimalScore, gameMode, trackShare }: AuditBoardProps) {
    const { trackAuditViewed } = useAnalytics();

    useEffect(() => {
        // Determine result
        let result: 'SOLVED' | 'UNSOLVED' = 'UNSOLVED';
        if (optimalScore !== null && levelScore >= optimalScore) {
            result = 'SOLVED';
        } else if (dailyResult?.passed) {
            result = 'SOLVED';
        }

        trackAuditViewed(gameMode, levelScore, result);
    }, []); // Run on mount

    const handleShareSuccess = () => {
        trackShare('audit_result', gameMode);
    };

    return (
        <div className="flex-1 flex items-center justify-center w-full min-h-0 p-6">
            <DailyAudit
                date={sessionDate}
                userHighScore={dailyResult?.score || levelScore}
                onClose={onClose}
                onDetectResistance={onDetectResistance}
                flavorText={flavorText}
                onShareSuccess={handleShareSuccess}
            />
        </div>
    );
}
