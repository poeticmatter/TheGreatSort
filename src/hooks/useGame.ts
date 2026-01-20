import { useState, useEffect, useRef, useCallback } from 'react';
import { CardItem, GamePhase, GameMode, ToolInstance, ToolType } from '../../types';
import { generateLevel, findOptimalScore, lengthFromLevel, stringToSeed, applyMove, Move, DailyState, generateTools } from '../utils/gameLogic';
import { getTodayDateString } from '../utils/dateUtils';
import { gradeLevel } from '../utils/gameLogic';

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

  // Tools are now an array of specific instances
  const [toolsAvailable, setToolsAvailable] = useState<ToolInstance[]>([]);

  const [selectedToolInstanceId, setSelectedToolInstanceId] = useState<string | null>(null);
  const [selection, setSelection] = useState<number | null>(null);
  const [shakeTools, setShakeTools] = useState(0);

  // --- New Modes State ---
  const [gameMode, setGameMode] = useState<GameMode>('DAILY');
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [currentSeed, setCurrentSeed] = useState<number | undefined>(undefined);

  // --- Refs ---
  const inspectionIndex = useRef(0);
  const lastSurvivorVal = useRef<number | null>(null);
  const lastSurvivorHasShield = useRef(false);
  const sortDirection = useRef<'ASC' | 'DESC' | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef(list);

  // Sync ref
  useEffect(() => { listRef.current = list; }, [list]);

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

            // Restore tools (either saved in state or regenerate from seed)
            // If savedState has tools, use them. Otherwise regenerate (backward compat?)
            // Daily tools are deterministic anyway.
            let currentTools = savedState.tools;
            if (!currentTools) {
                // Fallback for transition: generate tools
                currentTools = generateTools(seed);
            }

            // Replay moves
            savedState.moves.forEach(move => {
                currentList = applyMove(currentList, move.tool, move.index, move.targetIndex);

                // Mark tool as used
                // We need to find a tool of that type and mark it.
                // Since we don't track *which* exact instance ID was used in movesHistory (legacy),
                // we just take the first available one of that type.
                const toolIndex = currentTools.findIndex(t => t.type === move.tool && !t.used);
                if (toolIndex !== -1) {
                    currentTools[toolIndex].used = true;
                }
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

                // Restore optimal if available in result
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
            // Just show results
            setGameMode('DAILY');
            setDailyCompleted(true);
            const result = JSON.parse(savedDailyResult);
            setLevelScore(result.score);
            setOptimalScore(result.optimal);
            setLevel(1);
            setPhase(GamePhase.RESULTS);

            const seed = stringToSeed(today);
            // We need a list to show.
            setList(generateLevel(9, seed));
            // Tools
            setToolsAvailable(generateTools(seed));

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
        const best = findOptimalScore(list, toolsAvailable);
        setOptimalScore(best);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [list, phase, optimalScore, toolsAvailable]);

  // Save State Effect
  useEffect(() => {
    if (!isGameLoaded) return;

    if (gameMode === 'DAILY') {
      const today = getTodayDateString();

      if (phase === GamePhase.RESULTS) {
        localStorage.setItem(`daily_result_${today}`, JSON.stringify({
          score: levelScore,
          optimal: optimalScore
        }));
      }

      const phaseToSave = phase === GamePhase.INSPECTING ? GamePhase.PLANNING : phase;

      const stateToSave: DailyState = {
        date: today,
        moves: movesHistory,
        phase: phaseToSave,
        tools: toolsAvailable
      };
      localStorage.setItem(`daily_state_${today}`, JSON.stringify(stateToSave));
    }
  }, [phase, gameMode, levelScore, optimalScore, movesHistory, isGameLoaded, toolsAvailable]);


  // --- Game Actions ---

  const startLevel = (lvl: number, modeOverride?: GameMode, seedOverride?: number) => {
    const activeMode = modeOverride || gameMode;
    setLevel(lvl);

    let len = 0;
    let seed: number | undefined = undefined;
    let tools: ToolInstance[] = [];

    if (activeMode === 'CAREER') {
      len = lengthFromLevel(lvl);
      seed = undefined; // Level random

      // Career Tools Logic
      if (lvl === 1) {
          // Generate new career tools and save
          tools = generateTools(); // Random
          localStorage.setItem('career_tools', JSON.stringify(tools));
      } else {
          // Load career tools
          const savedTools = localStorage.getItem('career_tools');
          if (savedTools) {
              tools = JSON.parse(savedTools);
              // Reset 'used' status for the new level
              tools = tools.map(t => ({ ...t, used: false }));
          } else {
              // Fallback
              tools = generateTools();
              localStorage.setItem('career_tools', JSON.stringify(tools));
          }
      }

    } else if (activeMode === 'DAILY') {
      len = 9;
      seed = stringToSeed(getTodayDateString());
      tools = generateTools(seed);
    } else if (activeMode === 'PRACTICE') {
      len = 9;
      seed = seedOverride !== undefined ? seedOverride : Math.random() * 1000000;
      // If retrying (seedOverride provided), we should probably regenerate tools with same logic?
      // Since generateTools uses random, we need to seed it too if we want same tools.
      // But `generateTools` takes a seed.
      // If Practice is "random tools", then for retry we want "same random tools".
      // So passing the level seed to generateTools works if we want them tied.
      tools = generateTools(seed);
    }

    setCurrentSeed(seed);
    setList(generateLevel(len, seed));
    setToolsAvailable(tools);
    setMovesHistory([]);
    setPhase(GamePhase.PLANNING);
    setLevelScore(0);
    setOptimalScore(null);
    setDetectedMode(null);
    setSelectedToolInstanceId(null);
    setSelection(null);
    inspectionIndex.current = 0;
    lastSurvivorVal.current = null;
    sortDirection.current = null;
  };

  const changeMode = (newMode: GameMode) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (newMode === 'DAILY') {
      if (loadDailyState()) {
          setTotalScore(0);
          setTotalOptimalScore(0);
          setIsGameLoaded(true);
          return;
      }
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
    setIsGameLoaded(true);
  };

  const executeMove = (toolInstanceId: string, targetIndex: number) => {
    const toolInstance = toolsAvailable.find(t => t.instanceId === toolInstanceId);
    if (!toolInstance || toolInstance.used) return;

    const toolType = toolInstance.type;
    let newList = [...list];
    let recordedMove: Move | null = null;

    // Check interaction type
    // Two-step interactions: Swap, LongSwap, Merge, Sink, Float
    const isTwoStep = ['swap', 'longswap', 'merge', 'sink', 'float'].includes(toolType);

    if (isTwoStep) {
        if (selection === null) {
            setSelection(targetIndex);
            return;
        } else {
            // We have a selection. Validate move.
            let valid = false;
            const idx1 = selection;
            const idx2 = targetIndex;

            if (toolType === 'swap' || toolType === 'merge' || toolType === 'sink' || toolType === 'float') {
                // Must be adjacent
                if (Math.abs(idx1 - idx2) === 1) valid = true;
            } else if (toolType === 'longswap') {
                // Must be NON-adjacent
                if (Math.abs(idx1 - idx2) > 1) valid = true;
            }

            if (valid) {
                // Execute
                newList = applyMove(list, toolType, targetIndex, selection);
                recordedMove = {
                    tool: toolType,
                    index: targetIndex,
                    targetIndex: selection,
                    description: `${toolType} ${selection} and ${targetIndex}`
                };
                commitMove(newList, toolInstanceId, recordedMove);
            } else {
                // Invalid selection
                if (selection === targetIndex) {
                    setSelection(null); // Deselect
                } else {
                     setSelection(targetIndex); // Switch selection
                }
            }
        }
    } else {
        // One-step tools
        if (toolType === 'hop') {
             if (targetIndex <= 0 || targetIndex >= list.length - 1) return;
        }
        else if (toolType === 'mirror') {
             if (targetIndex === list.length - 1 - targetIndex) return;
        }

        newList = applyMove(list, toolType, targetIndex);
        recordedMove = {
            tool: toolType,
            index: targetIndex,
            description: `${toolType} at ${targetIndex}`
        };
        commitMove(newList, toolInstanceId, recordedMove);
    }
  };

  const commitMove = (newList: CardItem[], toolInstanceId: string, move: Move) => {
    setList(newList);
    setToolsAvailable(prev => prev.map(t =>
        t.instanceId === toolInstanceId ? { ...t, used: true } : t
    ));
    setMovesHistory(prev => [...prev, move]);
    setSelectedToolInstanceId(null);
    setSelection(null);
    localStorage.setItem('hasUsedAction', 'true');
  };

  const handleToolClick = (toolInstanceId: string) => {
    if (phase !== GamePhase.PLANNING) return;
    const toolInstance = toolsAvailable.find(t => t.instanceId === toolInstanceId);
    if (!toolInstance || toolInstance.used) return;

    // Check if we have a pending card selection (Reverse Flow)
    if (selection !== null) {
      // If we have a selection, and we click a tool...
      // If it's a two-step tool, we select the tool and keep card selection?
      // Or if it's one-step, we execute immediately?

      const isTwoStep = ['swap', 'longswap', 'merge', 'sink', 'float'].includes(toolInstance.type);

      if (isTwoStep) {
         setSelectedToolInstanceId(toolInstanceId);
         // Selection kept
      } else {
         // Immediate execution
         executeMove(toolInstanceId, selection);
      }
      return;
    }

    // Normal Flow (Tool first)
    if (selectedToolInstanceId === toolInstanceId) {
      setSelectedToolInstanceId(null);
      setSelection(null);
    } else {
      setSelectedToolInstanceId(toolInstanceId);
      setSelection(null);
    }
  };

  const handleCardClick = (item: CardItem) => {
    if (phase !== GamePhase.PLANNING) return;

    const index = list.findIndex(i => i.id === item.id);

    // Flow 1: Tool is already selected
    if (selectedToolInstanceId) {
      executeMove(selectedToolInstanceId, index);
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
        setShakeTools(prev => prev + 1);
      }
    }
  };

  const handleBackgroundClick = () => {
    if (phase === GamePhase.PLANNING) {
      setSelection(null);
      setSelectedToolInstanceId(null);
    }
  };

  // --- Inspection Logic ---

  const processNextStepWrapper = useCallback(() => {
     if (inspectionIndex.current >= listRef.current.length) {
         setPhase(GamePhase.RESULTS);
         setDailyCompleted(prev => gameMode === 'DAILY' ? true : prev);
         return;
     }

     const idx = inspectionIndex.current;

     setList(prev => prev.map((item, i) => i === idx ? { ...item, status: 'scanning' } : item));

     timeoutRef.current = setTimeout(() => {
         const currentItem = listRef.current[idx];
         const currentVal = currentItem.val;
         const currentHasShield = currentItem.hasShield || false;
         let survived = false;
         let pointsToAdd = 0;

         if (idx === 0) {
             survived = true;
             lastSurvivorVal.current = currentVal;
             lastSurvivorHasShield.current = currentHasShield;
         } else if (idx === 1) {
             survived = true;
             const prevVal = lastSurvivorVal.current!;
             if (currentVal >= prevVal) sortDirection.current = 'ASC';
             else sortDirection.current = 'DESC';
             lastSurvivorVal.current = currentVal;
             setDetectedMode(sortDirection.current);
         } else {
             if (lastSurvivorHasShield.current) {
                 survived = true;
             } else {
                 const threshold = lastSurvivorVal.current!;
                 const mode = sortDirection.current || 'ASC';
                 if (mode === 'ASC') {
                     if (currentVal >= threshold) survived = true;
                 } else {
                     if (currentVal <= threshold) survived = true;
                 }
             }

             if (survived) {
                 lastSurvivorVal.current = currentVal;
                 lastSurvivorHasShield.current = currentHasShield;
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
         timeoutRef.current = setTimeout(processNextStepWrapper, 600);
     }, 400);

  }, [gameMode]);

  const startInspection = () => {
    setPhase(GamePhase.INSPECTING);
    inspectionIndex.current = 0;
    lastSurvivorVal.current = null;
    lastSurvivorHasShield.current = false;
    sortDirection.current = null;
    setDetectedMode(null);
    processNextStepWrapper();
  };

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
      detectedMode, toolsAvailable, selectedTool: selectedToolInstanceId, selection, shakeTools,
      gameMode, dailyCompleted
    },
    actions: {
      changeMode, handleToolClick, handleCardClick, handleBackgroundClick,
      startInspection,
      nextLevel, retryPractice, resetGame, shareResult, toggleMusic: () => {}
    }
  };
}
