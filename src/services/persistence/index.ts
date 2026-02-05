import { SaveStateSchema, CachedSolution, DailyResult, DailyHistory, SCHEMA_VERSION } from './types';
import { getTodayDateString } from '../../utils/dateUtils';

const KEYS = {
    DAILY_STATE_PREFIX: 'daily_state_',
    DAILY_RESULT_PREFIX: 'daily_result_',
    SOLUTION_CACHE_PREFIX: 'tgs_solution_',
    DAILY_HISTORY: 'tgs_daily_history',
};

export const PersistenceService = {

    // --- Daily State ---

    // --- Resistance Persistence ---
    saveResistanceStatus: (status: boolean) => {
        try {
            localStorage.setItem('joinedResistance', String(status));
        } catch (e) {
            console.error("PersistenceService: Failed to save resistance status", e);
        }
    },

    loadResistanceStatus: (): boolean => {
        try {
            return localStorage.getItem('joinedResistance') === 'true';
        } catch (e) {
            return false;
        }
    },

    saveDailyState: (date: string, data: Omit<SaveStateSchema, 'version' | 'date' | 'gameMode'>) => {
        try {
            const payload: SaveStateSchema = {
                version: SCHEMA_VERSION,
                date,
                gameMode: 'DAILY', // Currently only saving Daily state this explicit way
                ...data
            };
            localStorage.setItem(`${KEYS.DAILY_STATE_PREFIX}${date}`, JSON.stringify(payload));
        } catch (e) {
            console.error("PersistenceService: Failed to save daily state", e);
        }
    },

    loadDailyState: (date: string): SaveStateSchema | null => {
        try {
            const raw = localStorage.getItem(`${KEYS.DAILY_STATE_PREFIX}${date}`);
            if (!raw) return null;

            const data = JSON.parse(raw);

            // Basic Validation
            if (data.version !== SCHEMA_VERSION) {
                console.warn(`PersistenceService: Version mismatch (Got ${data.version}, Expected ${SCHEMA_VERSION}). Discarding save.`);
                // In the future, we could implement a migration strategy here.
                return null;
            }

            return data as SaveStateSchema;
        } catch (e) {
            console.error("PersistenceService: Failed to load daily state", e);
            return null;
        }
    },

    clearDailyState: (date: string) => {
        localStorage.removeItem(`${KEYS.DAILY_STATE_PREFIX}${date}`);
    },

    // --- Daily Results ---

    saveDailyResult: (date: string, result: Omit<DailyResult, 'date'>) => {
        try {
            const payload: DailyResult = { date, ...result };
            localStorage.setItem(`${KEYS.DAILY_RESULT_PREFIX}${date}`, JSON.stringify(payload));
        } catch (e) {
            console.error("PersistenceService: Failed to save daily result", e);
        }
    },

    getDailyResult: (date: string): DailyResult | null => {
        try {
            const raw = localStorage.getItem(`${KEYS.DAILY_RESULT_PREFIX}${date}`);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error("PersistenceService: Failed to get daily result", e);
            return null;
        }
    },

    // --- Solution Cache ---

    saveSolution: (seed: number, solution: CachedSolution) => {
        try {
            localStorage.setItem(`${KEYS.SOLUTION_CACHE_PREFIX}${seed}`, JSON.stringify(solution));
        } catch (e) {
            console.error("PersistenceService: Failed to save solution", e);
        }
    },

    getSolution: (seed: number): CachedSolution | null => {
        try {
            const raw = localStorage.getItem(`${KEYS.SOLUTION_CACHE_PREFIX}${seed}`);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            // Silent error for cache miss/corruption
            return null;
        }
    },

    // --- Daily History (Stats) ---

    updateDailyHistory: (date: string, score: number) => {
        try {
            const historyStr = localStorage.getItem(KEYS.DAILY_HISTORY);
            const history: DailyHistory = historyStr ? JSON.parse(historyStr) : {};

            const existing = history[date];
            const now = Date.now();

            if (existing) {
                history[date] = {
                    ...existing,
                    attempts: existing.attempts + 1,
                    highScore: Math.max(existing.highScore, score),
                    lastPlayedAt: now
                };
            } else {
                history[date] = {
                    date,
                    highScore: score,
                    attempts: 1,
                    lastPlayedAt: now
                };
            }
            localStorage.setItem(KEYS.DAILY_HISTORY, JSON.stringify(history));
        } catch (e) {
            console.error("PersistenceService: Failed to update history", e);
        }
    },

    getDailyHistoryEntry: (date: string) => {
        try {
            const historyStr = localStorage.getItem(KEYS.DAILY_HISTORY);
            if (!historyStr) return null;
            const history: DailyHistory = JSON.parse(historyStr);
            return history[date] || null;
        } catch (e) {
            return null;
        }
    }
};
