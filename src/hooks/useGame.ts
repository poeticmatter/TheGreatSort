import { useState, useEffect, useRef, useCallback } from 'react';
import { CardItem, GamePhase, ToolsAvailable, GameMode } from '../../types';
import { generateLevel, findOptimalScore, lengthFromLevel, stringToSeed, applyMove, Move, DailyState, calculateBatchScore, gradeLevel } from '../utils/gameLogic';
import { getTodayDateString } from '../utils/dateUtils';

export function useGame() {
  // --- State ---
  const [level, setLevel] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [totalOptimalScore, setTotalOptimalScore] = useState(0);
  const [levelScore, setLevelScore] = useState(0);
  const [optimalScore, setOptimalScore] = useState<number | null>(null);

  const [list, setList] = useState<CardItem[]>([]);
  const [movesHistory, setMovesHistory] = useState<Move[]>([]);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.PLANNING);
  const [detectedMode, setDetectedMode] = useState<'ASC' | 'DESC' | null>(null);
  const [isGameLoaded, setIsGameLoaded] = useState(false);

  const [toolsAvailable, setToolsAvailable] = useState<ToolsAvailable>({
    swap: true, purge: true, promote: true, demote: true
  });

  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selection, setSelection] = useState<number | null>(null);
  const [shakeTools, setShakeTools] = useState(0);

  // --- New Modes State ---
  const [gameMode, setGameMode] = useState<GameMode>('DAILY');
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [currentSeed, setCurrentSeed] = useState<number | undefined>(undefined);

  // --- Refs ---
  const inspectionIndex = useRef(0);
  const lastSurvivorVal = useRef<number | null>(null);
  const sortDirection = useRef<'ASC' | 'DESC' | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Initialization & Effects ---

  // Helper to load daily state safely
  const loadDailyState = (): boolean => {
    const today = getTodayDateString();
    try {
        const savedStateStr = localStorage.getItem(`daily_state_${today}`);
        const savedDailyResult = localStorage.getItem(`daily_result_${today}`);

        if (savedStateStr) {
            // Restore detailed state
            const savedState: DailyState = JSON.parse(savedStateStr);
            const seed = stringToSeed(today);
            let currentList = generateLevel(9, seed);
            let currentTools: ToolsAvailable = { swap: true, purge: true, promote: true, demote: true };

            // Replay moves
            savedState.moves.forEach(move => {
                currentList = applyMove(currentList, move.tool, move.index, move.targetIndex);
                currentTools = { ...currentTools, [move.tool]: false };
            });

            setGameMode('DAILY');
            setLevel(1);
            setCurrentSeed(seed);
            setToolsAvailable(currentTools);
            setMovesHistory(savedState.moves);
            setPhase(savedState.phase);

            if (savedState.phase === GamePhase.RESULTS) {
                setDailyCompleted(true);
                // Grade and restore visual state
                const { score, gradedList } = gradeLevel(currentList);
                setList(gradedList);
                setLevelScore(score);

                // Restore optimal if available in result, or trigger recalc (recalc will happen via effect)
                if (savedDailyResult) {
                    const result = JSON.parse(savedDailyResult);
                    setOptimalScore(result.optimal);
                }
            } else {
                setList(currentList);
                setDailyCompleted(false);
            }
            return true;
        }

        // Fallback for legacy completed state (no moves saved)
        if (savedDailyResult) {
            const result = JSON.parse(savedDailyResult);
            // Only load legacy if we don't have new state (which is handled above)
            // But we must return true so we don't overwrite it?
            // If we have legacy result but no daily_state, we load legacy result.
            // And since we are in daily mode, the save effect might run.
            // But save effect saves `daily_state` which is new.
            // It won't overwrite `daily_result` unless phase is RESULTS.

            setGameMode('DAILY');
            setDailyCompleted(true);
            setLevelScore(result.score);
            setOptimalScore(result.optimal);
            setLevel(1);
            setPhase(GamePhase.RESULTS);
            // We should probably initialize list for legacy result?
            // Legacy result didn't store moves, so we can't restore list state accurately.
            // Just regenerate initial list? The user sees "Results".
            // If we regenerate initial list, it will look like un-sorted list but with Score shown.
            // That's acceptable for legacy transition.
            const seed = stringToSeed(today);
            setList(generateLevel(9, seed));
            setToolsAvailable({ swap: true, purge: true, promote: true, demote: true });

            return true;
        }

    } catch (e) {
        console.error("Failed to load daily state", e);
    }
    return false;
  };

  useEffect(() => {
    // Initial Load Logic
    const today = getTodayDateString();

    // Cleanup old daily states
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('daily_state_') && key !== `daily_state_${today}`) {
            localStorage.removeItem(key);
        }
    });

    if (!loadDailyState()) {
       // Start Fresh Daily if not loaded
       startLevel(1, 'DAILY');
    }
    setIsGameLoaded(true);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate Optimal Score in background
  useEffect(() => {
    if (list.length > 0 && phase === GamePhase.PLANNING && optimalScore === null) {
      // Small delay to let UI render first
      const timer = setTimeout(() => {
        const best = findOptimalScore(list);
        setOptimalScore(best);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [list, phase, optimalScore]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Save State Effect
  useEffect(() => {
    // Prevent saving if game isn't loaded yet to avoid overwriting state with initial defaults
    if (!isGameLoaded) return;

    if (gameMode === 'DAILY') {
      const today = getTodayDateString();

      // Save simplified result for easy checking
      if (phase === GamePhase.RESULTS) {
        localStorage.setItem(`daily_result_${today}`, JSON.stringify({
          score: levelScore,
          optimal: optimalScore
        }));
      }

      // Save detailed state
      // Avoid saving INSPECTING phase, revert to PLANNING or skip
      const phaseToSave = phase === GamePhase.INSPECTING ? GamePhase.PLANNING : phase;

      const stateToSave: DailyState = {
        date: today,
        moves: movesHistory,
        phase: phaseToSave
      };
      localStorage.setItem(`daily_state_${today}`, JSON.stringify(stateToSave));
    }
  }, [phase, gameMode, levelScore, optimalScore, movesHistory, isGameLoaded]);


  // --- Game Actions ---

  const startLevel = (lvl: number, modeOverride?: GameMode, seedOverride?: number) => {
    const activeMode = modeOverride || gameMode;
    setLevel(lvl);

    let len = 0;
    let seed: number | undefined = undefined;

    if (activeMode === 'CAREER') {
      len = lengthFromLevel(lvl);
      seed = undefined; // Random
    } else if (activeMode === 'DAILY') {
      len = 9;
      seed = stringToSeed(getTodayDateString());
    } else if (activeMode === 'PRACTICE') {
      len = 9;
      // If a seed override is passed (retry), use it. Otherwise random.
      seed = seedOverride !== undefined ? seedOverride : Math.random() * 1000000;
    }

    setCurrentSeed(seed);
    setList(generateLevel(len, seed));
    setToolsAvailable({ swap: true, purge: true, promote: true, demote: true });
    setMovesHistory([]); // Reset history
    setPhase(GamePhase.PLANNING);
    setLevelScore(0);
    setOptimalScore(null);
    setDetectedMode(null);
    setSelectedTool(null);
    setSelection(null);
    inspectionIndex.current = 0;
    lastSurvivorVal.current = null;
    sortDirection.current = null;
  };

  const changeMode = (newMode: GameMode) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Switch logic
    if (newMode === 'DAILY') {
      // Try to load daily state first
      if (loadDailyState()) {
          // Successfully loaded, just ensure total scores are reset if needed
          setTotalScore(0);
          setTotalOptimalScore(0);
          setIsGameLoaded(true);
          return;
      }

      // If load failed or no state, start fresh
      setGameMode(newMode);
      setTotalScore(0);
      setTotalOptimalScore(0);
      setDailyCompleted(false);
      startLevel(1, 'DAILY');
    } else {
      setGameMode(newMode);
      setTotalScore(0);
      setTotalOptimalScore(0);
      setDailyCompleted(false);
      startLevel(1, newMode);
    }
    // Ensure we mark game as loaded for other modes too (safe default)
    setIsGameLoaded(true);
  };

  const executeMove = (toolId: string, targetIndex: number) => {
    let newList = [...list];
    let recordedMove: Move | null = null;

    if (toolId === 'swap') {
        if (selection === null) {
            setSelection(targetIndex);
            return;
        } else {
            if (Math.abs(selection - targetIndex) === 1) {
                // Valid neighbor swap
                newList = applyMove(list, 'swap', targetIndex, selection);
                recordedMove = {
                    tool: 'swap',
                    index: targetIndex,
                    targetIndex: selection,
                    description: `Swap ${targetIndex} and ${selection}`
                };
                commitMove(newList, 'swap', recordedMove);
            } else if (selection === targetIndex) {
                // Deselect if clicking same
                setSelection(null);
            } else {
                // Switch selection
                setSelection(targetIndex);
            }
        }
    } else {
        // Other tools
        newList = applyMove(list, toolId as any, targetIndex);
        recordedMove = {
            tool: toolId as any,
            index: targetIndex,
            description: `${toolId} at ${targetIndex}`
        };
        commitMove(newList, toolId, recordedMove);
    }
  };

  const commitMove = (newList: CardItem[], toolId: string, move: Move) => {
    setList(newList);
    setToolsAvailable(prev => ({ ...prev, [toolId]: false }));
    setMovesHistory(prev => [...prev, move]);
    setSelectedTool(null);
    setSelection(null);
    localStorage.setItem('hasUsedAction', 'true');
  };

  const handleToolClick = (toolId: string) => {
    if (phase !== GamePhase.PLANNING) return;
    if (!toolsAvailable[toolId as keyof ToolsAvailable]) return;

    // Check if we have a pending card selection (Reverse Flow)
    if (selection !== null) {
      // If it's a swap, we just enter swap mode with the current selection
      if (toolId === 'swap') {
        setSelectedTool('swap');
        // Selection remains kept
      } else {
        // Immediate execution for single-target tools
        executeMove(toolId, selection);
      }
      return;
    }

    // Normal Flow (Tool first)
    if (selectedTool === toolId) {
      setSelectedTool(null);
      setSelection(null);
    } else {
      setSelectedTool(toolId);
      setSelection(null);
    }
  };

  const handleCardClick = (item: CardItem) => {
    if (phase !== GamePhase.PLANNING) return;

    const index = list.findIndex(i => i.id === item.id);

    // Flow 1: Tool is already selected
    if (selectedTool) {
      executeMove(selectedTool, index);
      return;
    }

    // Flow 2: No tool selected (Reverse Flow)
    if (selection === index) {
      // Clicked same card -> flash tools
      setShakeTools(prev => prev + 1);
    } else {
      // New selection
      setSelection(index);
      const hasUsed = localStorage.getItem('hasUsedAction');
      if (!hasUsed) {
        // Help user by flashing tools if they haven't used any yet
        setShakeTools(prev => prev + 1);
      }
    }
  };

  const handleBackgroundClick = () => {
    if (phase === GamePhase.PLANNING) {
      setSelection(null);
      setSelectedTool(null);
    }
  };

  // --- Inspection Logic ---

  const startInspection = () => {
    setPhase(GamePhase.INSPECTING);
    inspectionIndex.current = 0;
    lastSurvivorVal.current = null;
    sortDirection.current = null;
    setDetectedMode(null);
    processNextStep();
  };

  const processNextStep = () => {
    // End condition
    if (inspectionIndex.current >= list.length) {
        // We can't call endInspection directly because of closure scope if defined outside.
        // We need to trigger the end logic.
        // But endInspection depends on state.
        // Since we are inside a hook, we can call a function that accesses state?
        // No, `list` in `processNextStep` (via closure or ref) needs to be current.
        // Actually, `processNextStep` is called recursively via setTimeout.
        // The `list` accessed inside `processNextStep` will be stale if we don't be careful.
        // The original code used `processNextStep` defined inside the component, closing over the *current render's* scope?
        // No, `setTimeout(processNextStep, ...)` uses the `processNextStep` from the render where it was scheduled.
        // But state updates inside it (`setList`) use functional updates.
        // Accessing `list.length` might be stale.
        // `inspectionIndex` is a ref, so it's fresh.
        // But `list.length`?
        // In the original component, `list` was a dependency of `useEffect`? No, `processNextStep` wasn't in useEffect.
        // It was a function defined in the component body.
        // When `setTimeout` calls it, it calls the version from the closure when `setTimeout` was called.
        // If `list` changes (it does, status updates), the next `processNextStep` (recursively called)
        // is scheduled from the *previous* execution?
        // Wait, `timeoutRef.current = setTimeout(processNextStep, 600);`
        // This refers to `processNextStep` variable. In the component, `processNextStep` is recreated every render.
        // So `setTimeout` holds onto the *old* function.
        // The old function sees the *old* `list`.
        // BUT `inspectionIndex` is a ref.
        // `list[idx]` usage?
        // `setList(prev => ...)` is safe.
        // But `const currentItem = list[idx];` <-- this is dangerous if `list` is stale.
        // However, the items (values/ids) don't change, only their status.
        // So reading `list[idx]` from stale `list` might give an item with old status, but correct value/id.
        // And `setList` updates it.
        // The check `inspectionIndex.current >= list.length` is also potentially stale if list length changed.
        // But list length *doesn't* change during inspection.
        // So it might be fine.

        // To be safer and cleaner in a hook, let's use a `useEffect` that watches `phase` or `inspectionIndex`?
        // Or keep it as is, mirroring the working code.

        // I'll wrap it in a `useCallback` and use a ref for `list` to access current state if needed?
        // Or just trust that length doesn't change.
        finishInspection();
        return;
    }

    const idx = inspectionIndex.current;

    // 1. Highlight current item as scanning
    setList(prev => prev.map((item, i) =>
      i === idx ? { ...item, status: 'scanning' } : item
    ));

    // 2. Wait, then evaluate
    timeoutRef.current = setTimeout(() => {
        // We need to access the item.
        // We can get it from the state setter to be sure? No, we need it for logic.
        // Let's use a ref for list or just assume the closure is "fresh enough" if we are careful?
        // Actually, since we are moving to a hook, `list` is in scope.
        // We need `processNextStep` to be able to reference the *latest* list if possible, or at least the static data.

        // Ideally: use a ref to track the latest list if we need to read from it in async callbacks.
        // Or pass the list into the recursive call?

        // Let's use a Ref for the list that we update whenever list changes, just for reading in the loop.

        const currentItem = listRef.current[idx];
        const currentVal = currentItem.val;

        let survived = false;
        let pointsToAdd = 0;

        // Evaluation Logic
        if (idx === 0) {
          survived = true;
          lastSurvivorVal.current = currentVal;
        } else if (idx === 1) {
          survived = true;
          const prevVal = lastSurvivorVal.current!;
          if (currentVal >= prevVal) sortDirection.current = 'ASC';
          else sortDirection.current = 'DESC';
          lastSurvivorVal.current = currentVal;
          setDetectedMode(sortDirection.current);
        } else {
          const threshold = lastSurvivorVal.current!;
          const mode = sortDirection.current || 'ASC';
          if (mode === 'ASC') {
            if (currentVal >= threshold) survived = true;
          } else {
            if (currentVal <= threshold) survived = true;
          }
          if (survived) {
            lastSurvivorVal.current = currentVal;
          }
        }

        // Apply Status & Score
        if (survived) {
          pointsToAdd = currentVal;
          setLevelScore(prev => prev + pointsToAdd);
        }

        // Update List State
        setList(prevList => {
          const newList = [...prevList];
          if (survived) {
            newList[idx] = {
              ...currentItem,
              status: 'safe',
              linkScore: pointsToAdd
            };
          } else {
            newList[idx] = { ...currentItem, status: 'eliminated' };
          }
          return newList;
        });

      // 3. Move to next
      inspectionIndex.current++;
      timeoutRef.current = setTimeout(processNextStep, 600);
    }, 400);
  };

  const listRef = useRef(list);
  useEffect(() => { listRef.current = list; }, [list]);

  // We need `processNextStep` to be stable or handled correctly.
  // If we define it inside a useCallback, it depends on `detectedMode`, etc.
  // Actually, let's use a ref for the function too, or simpler:
  // Put the whole `processNextStep` logic into a useEffect that triggers on `phase === INSPECTING`?
  // No, that's complex with timeouts.

  // The original code had `processNextStep` accessing state.
  // The crucial part is that `list` inside `setTimeout` needs to be correct.
  // I added `listRef` to solve that.

  // But wait, `processNextStep` calls itself.
  // If `processNextStep` is re-created on render, the recursive call uses the OLD version (closed over).
  // So `listRef` is necessary.

  // Also `setDetectedMode` and `setLevelScore` are fine (functional updates or stable setters).

  // One issue: `processNextStep` itself needs to be stable or we need to call the latest version.
  // We can use a ref to hold the function.
  const processNextStepRef = useRef<() => void>(() => {});

  useEffect(() => {
    processNextStepRef.current = processNextStep;
  });

  const finishInspection = () => {
    setPhase(GamePhase.RESULTS);
    setTotalScore(prev => prev + levelScore); // Use current levelScore state?
    // levelScore is updated in the loop.
    // But inside `finishInspection`, `levelScore` might be stale if called from stale `processNextStep`.
    // Let's use functional update for setTotalScore: `setTotalScore(prev => prev + scoreRef.current)`?
    // Or just trust that since we call `setPhase(RESULTS)`, the effect that saves daily will run with correct state?
    // The effect runs when `phase` changes. By then `levelScore` should be updated?

    if (gameMode === 'DAILY') {
        setDailyCompleted(true);
    }
  };

  // --- End Inspection Logic Adjustment ---
  // To handle the recursion cleanly using refs:
  const processNextStepWrapper = useCallback(() => {
     // We define the logic here, but we use refs for all mutable state we need to read.
     // `listRef` is already set up.
     // `inspectionIndex`, `lastSurvivorVal`, `sortDirection` are refs.
     // `levelScore`? We write to it.

     if (inspectionIndex.current >= listRef.current.length) {
         // End
         setPhase(GamePhase.RESULTS);
         // We need to add the final levelScore to totalScore.
         // Since levelScore state update might be pending/async, we might not have the final value in `levelScore` variable here.
         // But `setLevelScore` was called in previous steps.
         // Actually, `levelScore` state is only needed for display and final total.
         // Let's rely on a `useEffect` to update `totalScore` when phase changes to RESULTS?
         setDailyCompleted(prev => gameMode === 'DAILY' ? true : prev);
         return;
     }

     const idx = inspectionIndex.current;

     // 1. Highlight
     setList(prev => prev.map((item, i) => i === idx ? { ...item, status: 'scanning' } : item));

     timeoutRef.current = setTimeout(() => {
         const currentItem = listRef.current[idx];
         const currentVal = currentItem.val;
         let survived = false;
         let pointsToAdd = 0;

         if (idx === 0) {
             survived = true;
             lastSurvivorVal.current = currentVal;
         } else if (idx === 1) {
             survived = true;
             const prevVal = lastSurvivorVal.current!;
             if (currentVal >= prevVal) sortDirection.current = 'ASC';
             else sortDirection.current = 'DESC';
             lastSurvivorVal.current = currentVal;
             setDetectedMode(sortDirection.current);
         } else {
             const threshold = lastSurvivorVal.current!;
             const mode = sortDirection.current || 'ASC';
             if (mode === 'ASC') {
                 if (currentVal >= threshold) survived = true;
             } else {
                 if (currentVal <= threshold) survived = true;
             }
             if (survived) {
                 lastSurvivorVal.current = currentVal;
             }
         }

         if (survived) {
             pointsToAdd = currentVal;
             setLevelScore(prev => prev + pointsToAdd);
         }

         setList(prevList => {
             const newList = [...prevList];
             if (survived) {
                 newList[idx] = { ...currentItem, status: 'safe', linkScore: pointsToAdd };
             } else {
                 newList[idx] = { ...currentItem, status: 'eliminated' };
             }
             return newList;
         });

         inspectionIndex.current++;
         timeoutRef.current = setTimeout(processNextStepWrapper, 600); // Call self
     }, 400);

  }, [gameMode]); // gameMode dependency is stable enough or we use ref if needed.

  // Update total score when entering results
  useEffect(() => {
    if (phase === GamePhase.RESULTS) {
      setTotalScore(prev => prev + levelScore);
      setTotalOptimalScore(prev => prev + (optimalScore || 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);


  const nextLevel = () => {
    if (gameMode === 'CAREER') {
      startLevel(level + 1);
    } else if (gameMode === 'PRACTICE') {
      startLevel(1, 'PRACTICE');
    }
  };

  const retryPractice = () => {
    if (gameMode === 'PRACTICE' && currentSeed !== undefined) {
      startLevel(1, 'PRACTICE', currentSeed);
    }
  };

  const resetGame = () => {
    if (gameMode === 'DAILY') return;
    setTotalScore(0);
    setTotalOptimalScore(0);
    startLevel(1);
  };

  const shareResult = async () => {
    const today = getTodayDateString();
    const efficiency = !optimalScore ? 0 : Math.min(100, Math.round((levelScore / optimalScore) * 100));
    const text = `The Great Sort Daily ${today}\nScore: ${levelScore}\nEfficiency: ${efficiency}%`;

    try {
      await navigator.clipboard.writeText(text);
      alert('Result copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert(text);
    }
  };

  return {
    state: {
      level, levelScore, totalScore, totalOptimalScore, optimalScore, list, phase,
      detectedMode, toolsAvailable, selectedTool, selection, shakeTools,
      gameMode, dailyCompleted
    },
    actions: {
      changeMode, handleToolClick, handleCardClick, handleBackgroundClick,
      startInspection: () => {
         setPhase(GamePhase.INSPECTING);
         inspectionIndex.current = 0;
         lastSurvivorVal.current = null;
         sortDirection.current = null;
         setDetectedMode(null);
         processNextStepWrapper();
      },
      nextLevel, retryPractice, resetGame, shareResult, toggleMusic: () => {} // handled in hook usage or here?
    }
  };
}
