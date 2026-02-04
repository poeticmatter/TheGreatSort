import { GameState } from '../reducers/gameState';
import { SaveStateSchema } from './persistence/types';
import { PuzzleRepository, DailyPuzzleData } from './puzzleRepository';
import { generateLevel, generateTools, applyMove, generateFlavorMap, gradeLevel } from '../utils/gameLogic';
import { GamePhase, ToolInstance, Move, GameMode, CardItem, HiddenRole, ResistanceStatus } from '../../types';

export interface HydrationResult {
    initialState: Partial<GameState>;
    isValid: boolean;
}

export class GameHydrationService {

    /**
     * Reconstructs the game state from a saved daily session.
     * This is a pure function that takes the save data and the daily puzzle definition
     * and returns a fully initialized state object.
     */
    static hydrateDailyFromSave(save: SaveStateSchema, puzzle: DailyPuzzleData): HydrationResult {
        // 1. Reconstruct Base State (The immutable starting point)
        const seed = puzzle.id;
        const startList = PuzzleRepository.hydrateSequence(puzzle.sequence);

        // Apply Resistance Data
        const { list: refinedStartList, resistanceStatus } = this.applyResistanceData(startList, puzzle);

        const startTools = PuzzleRepository.hydrateTools(puzzle.tools);
        const flavorMap = generateFlavorMap(seed);

        // 2. Replay Moves to get Current State
        // We deep copy startList to avoid mutation during replay if we were reusing it, 
        // though here we just created it.
        let currentList = refinedStartList.map(item => ({ ...item }));
        let currentTools = startTools.map(t => ({ ...t }));

        // Safety check for moves
        const moves = save.moves || [];

        moves.forEach(move => {
            // Apply move logic to list
            currentList = applyMove(currentList, move.tool, move.index, move.targetIndex).newList;

            // Mark tool as used
            const toolIndex = currentTools.findIndex(t => t.instanceId === move.toolInstanceId);
            // Fallback for older saves or mismatching IDs if necessary, but instanceId is preferred
            // If instanceId is missing in move (legacy), try to match by type and unused?
            // Assuming standard moves with instanceId for now as per schema.
            if (toolIndex !== -1) {
                currentTools[toolIndex].used = true;
            } else {
                // If strict instance matching fails (e.g. from a very old save or different generation),
                // try finding first unused tool of that type.
                const fallbackIndex = currentTools.findIndex(t => t.type === move.tool && !t.used);
                if (fallbackIndex !== -1) currentTools[fallbackIndex].used = true;
            }
        });

        // 3. Determine Phase and Scores
        let phase = save.snapshot?.phase || GamePhase.PLANNING;
        let levelScore = save.snapshot?.levelScore || 0;

        // If it was saved in RESULTS or we enter a state where it looks completed?
        // The previous useGame logic handled "Restore Phase" explicitly.
        // If phase is RESULTS, we should make sure the list is graded.

        if (phase === GamePhase.RESULTS) {
            const grade = gradeLevel(currentList);
            currentList = grade.gradedList;
            levelScore = grade.score;
        }

        const optimalScore = puzzle.targets?.max ?? null;
        const worstScore = puzzle.targets?.min ?? null;

        // 4. Construct the partial GameState
        const state: Partial<GameState> = {
            level: 1, // Daily is always level 1 effectively
            list: currentList,
            initialList: refinedStartList, // Crucial for Undo
            toolsAvailable: currentTools,
            currentSeed: seed,
            flavorMap,
            movesHistory: moves,
            phase,
            levelScore,
            optimalScore,
            worstScore,
            dailyCompleted: phase === GamePhase.RESULTS,
            resistanceStatus,
            // Default others
            totalScore: 0,
            totalOptimalScore: 0,
            shakeTools: 0,
            selection: null,
            selectedToolInstanceId: null,
        };

        return { initialState: state, isValid: true };
    }

    /**
     * Creates a fresh state for a Daily Challenge (not loaded from save).
     */
    static hydrateDailyNew(puzzle: DailyPuzzleData): HydrationResult {
        const seed = puzzle.id;
        const list = PuzzleRepository.hydrateSequence(puzzle.sequence);

        // Apply Resistance Data
        const { list: refinedList, resistanceStatus } = this.applyResistanceData(list, puzzle);

        const tools = PuzzleRepository.hydrateTools(puzzle.tools);
        const flavorMap = generateFlavorMap(seed);

        const optimalScore = puzzle.targets?.max ?? null;
        const worstScore = puzzle.targets?.min ?? null;

        const state: Partial<GameState> = {
            level: 1,
            list: refinedList,
            initialList: [...refinedList], // Copy for initialList
            toolsAvailable: tools,
            currentSeed: seed,
            flavorMap,
            movesHistory: [],
            phase: GamePhase.PLANNING,
            levelScore: 0,
            optimalScore,
            worstScore,
            dailyCompleted: false,
            resistanceStatus,
        };

        return { initialState: state, isValid: true };
    }

    /**
     * Creates a fresh state for Practice Mode.
     */
    static hydratePractice(seedOverride?: number): HydrationResult {
        const seed = seedOverride !== undefined ? seedOverride : Math.random() * 1000000;

        // Practice configuration
        const length = 9;
        const list = generateLevel(length, seed);
        const tools = generateTools(seed);
        const flavorMap = generateFlavorMap(seed);

        const state: Partial<GameState> = {
            level: 1,
            list: list,
            initialList: [...list],
            toolsAvailable: tools,
            currentSeed: seed,
            flavorMap,
            movesHistory: [],
            phase: GamePhase.PLANNING,
            levelScore: 0,
            optimalScore: null, // Practice calculates this async usually
            worstScore: null,
            dailyCompleted: false,
            resistanceStatus: ResistanceStatus.INACTIVE,
        };

        return { initialState: state, isValid: true };
    }

    /**
     * Applies Resistance Mode data to the item list if present in the puzzle.
     */
    private static applyResistanceData(list: CardItem[], puzzle: DailyPuzzleData): { list: CardItem[], resistanceStatus: ResistanceStatus } {
        const resistanceData = puzzle.resistanceData;
        console.log("Resistance Mode Initialized:", resistanceData ? "YES" : "NO");

        if (!resistanceData) {
            return {
                list: list.map(item => ({ ...item, hiddenRole: HiddenRole.NONE, delta: 0 })),
                resistanceStatus: ResistanceStatus.INACTIVE
            };
        }

        const agents = resistanceData.agents;
        const newList = list.map((item, index) => {
            const agentData = agents[index];
            let hiddenRole = HiddenRole.NONE;
            let trueValue = item.val;

            if (agentData) {
                hiddenRole = agentData.role === 'RESISTANCE' ? HiddenRole.RESISTANCE : HiddenRole.STATE;
            }

            return {
                ...item,
                hiddenRole,
                delta: agentData ? agentData.delta : 0
            };
        });

        return {
            list: newList,
            resistanceStatus: ResistanceStatus.INACTIVE
        };
    }
}
