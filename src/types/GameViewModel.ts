import { GameState } from '../reducers/gameState';
import { SystemMood } from '../hooks/useSystemMood';
import { GameMode } from '../../types';

export interface GameViewModel extends GameState {
    // Meta State
    gameMode: GameMode;
    sessionDate: string;
    isLocked: boolean;
    dailyResult: any; // Weak type for now unless we import DailyResult

    // Derived
    mood: SystemMood;
    compliancePercentage: number;
    resistanceActive: boolean;
    trueYield?: number;

    // Aliases & Extras
    selectedTool: string | null;
    persistenceLoaded: boolean;
    startingCompliance: number;
    isZeroYield: boolean;
    yieldRatio: number;
    currentScore: number;
}
