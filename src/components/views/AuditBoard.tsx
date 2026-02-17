import React, { useEffect } from 'react';
import { DailyAudit } from '../DailyAudit';
import { useAnalytics } from '../../hooks/useAnalytics';
import { PersistenceService } from '../../services/persistence';
import { GameMode } from '../../types';

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
        const hasJoined = PersistenceService.loadResistanceStatus();
        const effectiveMode: GameMode = (gameMode === 'DAILY' && hasJoined) ? 'RESISTANCE' : gameMode;

        // Determine result
        let result: 'SOLVED' | 'UNSOLVED' = 'UNSOLVED';
        if (optimalScore !== null && levelScore >= optimalScore) {
            result = 'SOLVED';
        } else if (dailyResult?.passed) {
            result = 'SOLVED';
        }

        // We know effectiveMode is "DAILY" | "PRACTICE" | "RESISTANCE"
        trackAuditViewed(effectiveMode, levelScore, result);
    }, []); // Run on mount

    const handleShareSuccess = () => {
        const effectiveMode: GameMode = (gameMode === 'DAILY' && PersistenceService.loadResistanceStatus()) ? 'RESISTANCE' : gameMode;
        trackShare('audit_result', effectiveMode);
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
