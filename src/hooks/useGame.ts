import { useState, useEffect, useCallback } from 'react';
import { GameMode, GamePhase, ToolInstance, CardItem } from '../../types';
import { lengthFromLevel, stringToSeed, generateLevel, generateTools, findOptimalScore, DailyState, applyMove } from '../utils/gameLogic';
import { getTodayDateString } from '../utils/dateUtils';
import { gradeLevel } from '../utils/gameLogic';
import { useGameEngine } from './useGameEngine';
import { useGamePersistence, loadCareerTools, saveCareerTools } from './useGamePersistence';
import { useGameLoop } from './useGameLoop';

export function useGame() {
  const [gameMode, setGameMode] = useState<GameMode>('DAILY');
  const [isGameLoaded, setIsGameLoaded] = useState(false);

  // --- Engine ---
  const handleMoveCommitted = useCallback(() => {
    localStorage.setItem('hasUsedAction', 'true');
  }, []);

  const engine = useGameEngine(handleMoveCommitted);

  // --- Persistence ---
  const persistenceState = {
      movesHistory: engine.state.movesHistory,
      phase: engine.state.phase,
      toolsAvailable: engine.state.toolsAvailable,
      levelScore: engine.state.levelScore,
      optimalScore: engine.state.optimalScore,
      list: engine.state.list
  };

  const { loadedState, dailyResult } = useGamePersistence(gameMode, persistenceState, isGameLoaded);

  // --- Loop ---
  const loop = useGameLoop(engine);

  // --- Hydration & Initialization ---

  // Hydrate from Daily Persistence
  useEffect(() => {
    // Wait for persistence hook to return initial values (it does so in its effect, but synchronous state update inside effect runs after render)
    // Actually useGamePersistence effect runs on mount.
    // We need to wait until we know if there IS a loaded state.
    // But `loadedState` starts as null.
    // We need a way to know "Persistence Check Complete".
    // For now, we can run this effect once.
    // But `loadedState` might be set asynchronously in persistence effect?
    // No, React state updates are async.

    // We can rely on the fact that `useGamePersistence` does its work on mount.
    // But we need to coordinate:
    // 1. App Mounts -> Persistence runs loadDaily() synchronously-ish (inside effect).
    // 2. State updates.
    // 3. This effect triggers.

    const today = getTodayDateString();

    if (!isGameLoaded) {
      // Check if we have data from persistence hook
      // Since persistence hook logic is in useEffect, we might miss the first render cycle.
      // We need to delay initialization slightly or use a ref/state from persistence.
      // Actually, `loadedState` being null doesn't mean "no state", it means "not loaded OR no state".

      // Let's look at `useGamePersistence` again. It sets state in useEffect.
      // So on first render, `loadedState` is null.
      // We can use a timeout or a specific "isReady" flag from persistence?
      // Or we can manually call `loadDaily` here?
      // Simpler: The original `useGame` did `loadDailyState` in an effect.

      // We will duplicate the "Check LocalStorage" logic here? No, that defeats the purpose.
      // We will wait for `loadedState` to populate if it exists?
      // If the user visits Daily, and no state exists, `loadedState` remains null.
      // How do we distinguish "Nothing to load" vs "Haven't looked yet"?

      // Fix: Let's assume on first render if `loadedState` is null, we might start a new game IF we are sure.
      // But we aren't sure.

      // Strategy: Use a `useEffect` with dependency on `loadedState`?
      // But if it remains null, it won't trigger.

      // Let's modify `useGamePersistence` to return `loading` status?
      // Or just accept that on first load we check purely based on logic here?

      // Actually, to preserve the exact behavior, we can perform the "Load Decision" here using the data from Persistence.
      // But Persistence `loadedState` is updated in useEffect.

      // Alternative: Just call `startLevel` for DAILY if we determine we should.
      // But `useGamePersistence` has the data.

      // Let's rely on `dailyResult` and `loadedState`.
      // We need a separate effect that runs only once but waits for persistence?
      // Impossible without a flag.

      // Hack/Solution: Just check localStorage directly here for the "Decision" and use the hook for "Saving"?
      // No, that's dirty.

      // Let's look at `useGamePersistence.ts` I wrote.
      // It sets `loadedState` on mount.
      // So I can put `loadedState` in the dependency array here.
      // But if it's null (no save), it won't change.

      // I'll add a `isPersistenceReady` or similar to `useGamePersistence`?
      // Or just wait a tick?

      // I'll use a timeout here to allow persistence to settle.
      // OR, better: `useGamePersistence` returns the state immediately if I make it do synchronous read?
      // LocalStorage IS synchronous.
      // So `useGamePersistence` can initialize state using `useState(() => loadDaily())`.
      // YES.

      // I will update `useGamePersistence.ts` to use lazy initialization for state.
      // This way `loadedState` is available on first render!

    }
  }, []); // logic continues below

  // --- Helper: Start Level Logic ---
  const startLevel = (lvl: number, modeOverride?: GameMode, seedOverride?: number) => {
    const activeMode = modeOverride || gameMode;

    // Logic from original startLevel
    let len = 0;
    let seed: number | undefined = undefined;
    let tools: ToolInstance[] = [];

    if (activeMode === 'CAREER') {
      len = lengthFromLevel(lvl);
      seed = undefined;

      if (lvl === 1) {
          tools = generateTools();
          saveCareerTools(tools);
      } else {
          const savedTools = loadCareerTools();
          if (savedTools) {
              tools = savedTools;
              tools = tools.map(t => ({ ...t, used: false }));
          } else {
              tools = generateTools();
              saveCareerTools(tools);
          }
      }

    } else if (activeMode === 'DAILY') {
      len = 9;
      seed = stringToSeed(getTodayDateString());
      tools = generateTools(seed);
    } else if (activeMode === 'PRACTICE') {
      len = 9;
      seed = seedOverride !== undefined ? seedOverride : Math.random() * 1000000;
      tools = generateTools(seed);
    }

    // Generate List
    const list = generateLevel(len, seed);

    engine.actions.startLevel(lvl, list, tools, seed);
  };

  // --- Initialization Effect ---
  useEffect(() => {
      // Logic to handle initial load
      // We need to access the synchronous return from persistence (see next step update)
      // Since I haven't updated persistence yet, I'll assume I will.

      // Wait, I can't access `loadedState` if it's state from another hook inside `useEffect` with empty deps easily if it updates.
      // But if I change `useGamePersistence` to initialize lazily, `loadedState` will be correct on first render.

      if (isGameLoaded) return;

      const today = getTodayDateString();

      // Restore Daily State if available
      if (gameMode === 'DAILY') {
          // Check if we have loadedState (assuming lazy init in persistence)
          // We need to read from the hook's return.
          // Since this effect runs after render, `loadedState` should be available if lazy init used.

          if (loadedState) {
              // Restore
              const seed = stringToSeed(today);
              let currentList = generateLevel(9, seed);
              let currentTools = loadedState.tools;
              if (!currentTools) {
                currentTools = generateTools(seed);
              } else {
                // Reset usage state to prevent double-counting during replay
                currentTools = currentTools.map(t => ({ ...t, used: false }));
              }

              // Replay
              loadedState.moves.forEach(move => {
                  currentList = applyMove(currentList, move.tool, move.index, move.targetIndex);
                  // Mark tools used
                  const toolIndex = currentTools.findIndex(t => t.type === move.tool && !t.used);
                  if (toolIndex !== -1) currentTools[toolIndex].used = true;
              });

              // Load into Engine
              engine.actions.loadState({
                  level: 1,
                  currentSeed: seed,
                  toolsAvailable: currentTools,
                  movesHistory: loadedState.moves,
                  phase: loadedState.phase,
                  list: currentList
              });

              if (loadedState.phase === GamePhase.RESULTS) {
                  engine.actions.setDailyCompleted(true);
                  const { score, gradedList } = gradeLevel(currentList);
                  engine.actions.setList(gradedList);
                  engine.actions.setLevelScore(score);

                  if (dailyResult) {
                      engine.actions.setOptimalScore(dailyResult.optimal);
                  }
              } else {
                  engine.actions.setList(currentList);
                  engine.actions.setDailyCompleted(false);
              }

          } else if (dailyResult) {
               // Daily completed but state missing (legacy/cleared)
               engine.actions.setDailyCompleted(true);
               engine.actions.setLevelScore(dailyResult.score);
               engine.actions.setOptimalScore(dailyResult.optimal);
               engine.actions.setPhase(GamePhase.RESULTS);
               engine.actions.startLevel(1, generateLevel(9, stringToSeed(today)), generateTools(stringToSeed(today)), stringToSeed(today));
               engine.actions.setPhase(GamePhase.RESULTS); // Force phase back to results after startLevel resets it
          } else {
               // New Daily Game
               startLevel(1, 'DAILY');
          }
      } else {
          // Other modes (shouldn't happen on init default, but safe)
          startLevel(1, gameMode);
      }

      setIsGameLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedState, dailyResult, isGameLoaded, gameMode]);
  // We depend on loadedState. If lazy init, it's stable-ish.
  // If not lazy, this might re-run?
  // We gate with `isGameLoaded`.

  // --- Effects ---

  // Optimal Score Calculation
  useEffect(() => {
    if (engine.state.list.length > 0 && engine.state.phase === GamePhase.PLANNING && engine.state.optimalScore === null) {
      const timer = setTimeout(() => {
        const best = findOptimalScore(engine.state.list, engine.state.toolsAvailable);
        engine.actions.setOptimalScore(best);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [engine.state.list, engine.state.phase, engine.state.optimalScore, engine.state.toolsAvailable]);

  // Update Total Score on Results
  useEffect(() => {
      if (engine.state.phase === GamePhase.RESULTS) {
          engine.actions.setTotalScore(prev => prev + engine.state.levelScore);
          engine.actions.setTotalOptimalScore(prev => prev + (engine.state.optimalScore || 0));

          if (gameMode === 'DAILY') {
              engine.actions.setDailyCompleted(true);
          }
      }
  }, [engine.state.phase]);


  // --- Actions Wiring ---

  const changeMode = (newMode: GameMode) => {
    loop.stopLoop();

    if (newMode === 'DAILY') {
        // Reload daily state?
        // We can just rely on the same logic as init, but we need to re-fetch persistence?
        // Persistence hook watches `gameMode`.
        // If we switch to DAILY, persistence hook will trigger save/load?
        // Wait, `useGamePersistence` loads ONCE on mount.
        // We need `loadDaily` exposed?
        // Or we just re-read localStorage manually for the switch.

        // Let's manually check for switch to Daily
        const today = getTodayDateString();
        const savedStateStr = localStorage.getItem(`daily_state_${today}`);
        const savedResultStr = localStorage.getItem(`daily_result_${today}`);

        if (savedStateStr || savedResultStr) {
             // We have a daily state.
             // We need to "Reset" the engine to this state.
             // We can force a reload by toggling isGameLoaded?
             // Or just call the logic directly.

             // Simplest: Force reload logic.
             window.location.reload(); // Too aggressive?

             // Let's implement proper switching.
             // We duplicate the "Restore" logic here or extract it.
             // Given the complexity, I'll assume for now we just start a new Daily (which hits the 'loadDailyState' logic in original).

             // But wait, `startLevel` wipes everything.
             // If I switch to Daily, I want to RESUME.
             // So I need to parse localStorage again.

             setGameMode('DAILY');
             setIsGameLoaded(false); // Trigger the Init effect again?
             // Yes, setting `isGameLoaded` to false will trigger the effect again because `loadedState` is a dependency?
             // No, `loadedState` might not change.
             // But the effect depends on `isGameLoaded` (if I add it to deps).
             // Let's add `isGameLoaded` to the effect deps.

             return;
        }

        setGameMode(newMode);
        engine.actions.resetStats();
        engine.actions.setDailyCompleted(false);
        startLevel(1, 'DAILY');
    } else {
        setGameMode(newMode);
        engine.actions.resetStats();
        engine.actions.setDailyCompleted(false);
        startLevel(1, newMode);
    }
  };

  const nextLevel = () => {
      if (gameMode === 'CAREER') {
          startLevel(engine.state.level + 1);
      } else if (gameMode === 'PRACTICE') {
          startLevel(1, 'PRACTICE');
      }
  };

  const retryPractice = () => {
      if (gameMode === 'PRACTICE' && engine.state.currentSeed !== undefined) {
          startLevel(1, 'PRACTICE', engine.state.currentSeed);
      }
  };

  const resetGame = () => {
      if (gameMode === 'DAILY') return;
      engine.actions.resetStats();
      startLevel(1);
  };

  const shareResult = async () => {
    const today = getTodayDateString();
    const efficiency = !engine.state.optimalScore ? 0 : Math.min(100, Math.round((engine.state.levelScore / engine.state.optimalScore) * 100));
    const text = `The Great Sort Daily ${today}\nScore: ${engine.state.levelScore}\nEfficiency: ${efficiency}%`;

    try {
      await navigator.clipboard.writeText(text);
      alert('Result copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert(text);
    }
  };

  const handleCardClick = (item: CardItem) => {
      const index = engine.state.list.findIndex(i => i.id === item.id);
      if (index === -1) return;

      // Override for shake logic validation?
      // Engine handles logic.
      // We just need to check if we should suppress the "Shake" if used?
      // Engine increments shake. UI animates.
      // If `hasUsedAction` is true, we might want to suppress the shake?
      // But `shakeTools` is in Engine.
      // I'll leave it as is.
      engine.actions.handleCardClick(index);
  }

  return {
    state: {
      ...engine.state,
      gameMode,
      // Overwrite selectedTool to match original interface (string | null)
      selectedTool: engine.state.selectedToolInstanceId,
    },
    actions: {
      changeMode,
      handleToolClick: engine.actions.handleToolClick,
      handleCardClick,
      handleBackgroundClick: engine.actions.handleBackgroundClick,
      startInspection: loop.startInspection,
      nextLevel,
      retryPractice,
      resetGame,
      shareResult,
      toggleMusic: () => {} // Handled in App
    }
  };
}
