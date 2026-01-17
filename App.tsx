import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeftToLine, ArrowRightToLine, Trash2, ArrowRightLeft, 
  Play, RotateCcw, TrendingUp, TrendingDown, Star, AlertCircle, Award,
  Volume2, VolumeX, Share2, ChevronDown, Repeat
} from 'lucide-react';
import Card from './components/Card';
import { CardItem, GamePhase, ToolDefinition, ToolsAvailable, GameMode } from './types';
import { generateLevel, findOptimalScore, lengthFromLevel, stringToSeed } from './utils/gameLogic';
import { useMusic } from './src/hooks/useMusic';

const TOOLS: Record<string, ToolDefinition> = {
  DEMOTE: { id: 'demote', name: 'Demote', icon: ArrowLeftToLine, desc: 'Move item to the start (Left)' },
  SWAP: { id: 'swap', name: 'Swap', icon: ArrowRightLeft, desc: 'Switch two adjacent items' },
  PURGE: { id: 'purge', name: 'Purge', icon: Trash2, desc: 'Eliminate one item' },
  PROMOTE: { id: 'promote', name: 'Promote', icon: ArrowRightToLine, desc: 'Move item to the end (Right)' },
};

const TOOLS_DISPLAY_ORDER = ['demote', 'swap', 'purge', 'promote'];

export default function TheGreatSort() {
  // --- State ---
  const [level, setLevel] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [levelScore, setLevelScore] = useState(0);
  const [optimalScore, setOptimalScore] = useState<number | null>(null);
  
  const [list, setList] = useState<CardItem[]>([]);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.PLANNING);
  const [detectedMode, setDetectedMode] = useState<'ASC' | 'DESC' | null>(null); 
  
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
  const [showModeMenu, setShowModeMenu] = useState(false);

  // --- Music ---
  const { isPlaying, toggleMusic } = useMusic();

  // --- Refs ---
  const inspectionIndex = useRef(0);
  const lastSurvivorVal = useRef<number | null>(null);
  const sortDirection = useRef<'ASC' | 'DESC' | null>(null); 
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Helpers for Daily ---
  const getTodayDateString = () => {
    const d = new Date();
    // Use UTC for consistent Daily Challenge globally
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // --- Initialization & Effects ---
  useEffect(() => {
    // Initial Load Logic
    const today = getTodayDateString();
    const savedDaily = localStorage.getItem(`daily_result_${today}`);

    if (savedDaily) {
       // Daily already done
       const result = JSON.parse(savedDaily);
       setGameMode('DAILY');
       setDailyCompleted(true);
       setLevelScore(result.score);
       setOptimalScore(result.optimal);
       setLevel(1);
       // We can't really restore the list visual state easily without storing it all,
       // but for the report card we just need score/efficiency.
       // Let's set phase to RESULTS directly.
       setPhase(GamePhase.RESULTS);
    } else {
       // Start Fresh Daily
       startLevel(1, 'DAILY');
    }

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
    setGameMode(newMode);
    setShowModeMenu(false);
    setTotalScore(0);

    if (newMode === 'DAILY') {
      const today = getTodayDateString();
      const savedDaily = localStorage.getItem(`daily_result_${today}`);
      if (savedDaily) {
         const result = JSON.parse(savedDaily);
         setDailyCompleted(true);
         setLevelScore(result.score);
         setOptimalScore(result.optimal);
         setLevel(1);
         setPhase(GamePhase.RESULTS);
      } else {
         setDailyCompleted(false);
         startLevel(1, 'DAILY');
      }
    } else {
      setDailyCompleted(false);
      startLevel(1, newMode);
    }
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
      if (level === 1) {
        // Help user by flashing tools on first level
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

  const executeMove = (toolId: string, targetIndex: number) => {
    const newList = [...list];

    if (toolId === 'purge') {
      newList.splice(targetIndex, 1);
      commitMove(newList, 'purge');
    } 
    else if (toolId === 'demote') {
      const [moved] = newList.splice(targetIndex, 1);
      newList.unshift(moved);
      commitMove(newList, 'demote');
    }
    else if (toolId === 'promote') {
      const [moved] = newList.splice(targetIndex, 1);
      newList.push(moved);
      commitMove(newList, 'promote');
    }
    else if (toolId === 'swap') {
      if (selection === null) {
        setSelection(targetIndex);
      } else {
        if (Math.abs(selection - targetIndex) === 1) {
          // Valid neighbor swap
          [newList[selection], newList[targetIndex]] = [newList[targetIndex], newList[selection]];
          commitMove(newList, 'swap');
        } else if (selection === targetIndex) {
          // Deselect if clicking same
          setSelection(null);
        } else {
          // Switch selection
          setSelection(targetIndex);
        }
      }
    }
  };

  const commitMove = (newList: CardItem[], toolId: string) => {
    setList(newList);
    setToolsAvailable(prev => ({ ...prev, [toolId]: false }));
    setSelectedTool(null);
    setSelection(null);
  };
  
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
      endInspection();
      return;
    }

    const idx = inspectionIndex.current;
    
    // 1. Highlight current item as scanning
    setList(prev => prev.map((item, i) => 
      i === idx ? { ...item, status: 'scanning' } : item
    ));

    // 2. Wait, then evaluate
    timeoutRef.current = setTimeout(() => {
        const currentItem = list[idx];
        const currentVal = currentItem.val;
        
        let survived = false;
        let pointsToAdd = 0;

        // Evaluation Logic (Performed ONCE outside updater)
        if (idx === 0) {
          // First item always survives
          survived = true;
          lastSurvivorVal.current = currentVal;
        } else if (idx === 1) {
          // Second item determines direction
          survived = true;
          const prevVal = lastSurvivorVal.current!; // Safe assertion, idx 0 always runs first
          
          if (currentVal >= prevVal) sortDirection.current = 'ASC';
          else sortDirection.current = 'DESC';
          
          lastSurvivorVal.current = currentVal;
          setDetectedMode(sortDirection.current);
        } else {
          // Subsequent items check against last survivor
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
    }, 400); // Scan duration
  };

  const endInspection = () => {
    setPhase(GamePhase.RESULTS);
    setTotalScore(prev => prev + levelScore); 

    // Handle Persistence for Daily
    if (gameMode === 'DAILY') {
      const today = getTodayDateString();
      localStorage.setItem(`daily_result_${today}`, JSON.stringify({
        score: levelScore + (list[list.length - 1].status !== 'eliminated' ? 0 : 0), // Small hack: levelScore is updated in state, but might lag one frame? No, we use setter.
        // Wait, levelScore state inside this function might be stale?
        // `endInspection` is called from `processNextStep`, which is a timeout chain.
        // We should use the functional update or a ref to be safe, but let's trust React for now or fix if buggy.
        // Actually, better to read the final score from state after a render, but `endInspection` runs immediately.
        // Let's defer storage slightly or assume `levelScore` (state) is not yet updated with the LAST item's result?
        // Ah, `processNextStep` updates score, then sets timeout for `processNextStep` again.
        // The last step finishes, updates score, then calls `processNextStep` again -> index >= length -> `endInspection`.
        // So `levelScore` should be up to date?
        // Wait, state updates are async. If the last item adds score, and we recursively call, the state *might* be updated on next render.
        // However, `endInspection` sets the phase.
        // Let's rely on `useEffect` to save if phase becomes RESULTS and mode is daily?
        optimal: optimalScore
      }));
      setDailyCompleted(true);
    }
  };

  // Safer save effect
  useEffect(() => {
    if (gameMode === 'DAILY' && phase === GamePhase.RESULTS) {
      const today = getTodayDateString();
      localStorage.setItem(`daily_result_${today}`, JSON.stringify({
        score: levelScore,
        optimal: optimalScore
      }));
    }
  }, [phase, gameMode, levelScore, optimalScore]);

  const nextLevel = () => {
    if (gameMode === 'CAREER') {
      startLevel(level + 1);
    } else if (gameMode === 'PRACTICE') {
      // New seed
      startLevel(1, 'PRACTICE');
    }
    // Daily: No next level
  };

  const retryPractice = () => {
    if (gameMode === 'PRACTICE' && currentSeed !== undefined) {
      startLevel(1, 'PRACTICE', currentSeed);
    }
  };
  
  const resetGame = () => {
    if (gameMode === 'DAILY') return; // Cannot reset daily
    setTotalScore(0);
    startLevel(1);
  };

  const shareResult = async () => {
    const today = getTodayDateString();
    const efficiency = getEfficiency();
    const text = `The Great Sort Daily ${today}\nScore: ${levelScore}\nEfficiency: ${efficiency}%`;

    try {
      await navigator.clipboard.writeText(text);
      alert('Result copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback
      alert(text);
    }
  };

  // --- Render Helpers ---

  const getEfficiency = () => {
    if (!optimalScore) return 0;
    return Math.min(100, Math.round((levelScore / optimalScore) * 100));
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-200 font-sans selection:bg-red-500/30 flex flex-col">
      
      {/* --- HEADER --- */}
      <header className="px-6 py-4 border-b-4 border-red-900 bg-gradient-to-r from-red-950 to-stone-900 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 z-10 sticky top-0">
        <div className="flex flex-col items-center md:items-start">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Star className="text-amber-500 fill-amber-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" size={32} />
              <div className="absolute inset-0 blur-sm bg-amber-500/30 rounded-full"></div>
            </div>
            <h1 className="text-3xl font-[Cinzel] font-bold text-amber-500 tracking-widest uppercase drop-shadow-md">
              The Great Sort
            </h1>
          </div>

          <div className="relative mt-2 ml-1 z-50">
             <button
               onClick={() => setShowModeMenu(!showModeMenu)}
               className="flex items-center gap-1 text-[12px] text-stone-400 font-[Courier] uppercase tracking-[0.2em] hover:text-amber-500 transition-colors"
             >
               Mode: <span className="text-amber-500 font-bold">{gameMode}</span> <ChevronDown size={12} />
             </button>

             {showModeMenu && (
               <div className="absolute top-full left-0 mt-1 w-40 bg-stone-900 border border-stone-700 shadow-xl rounded-sm flex flex-col p-1">
                 {(['CAREER', 'DAILY', 'PRACTICE'] as GameMode[]).map(m => (
                   <button
                     key={m}
                     onClick={() => changeMode(m)}
                     className={`text-left px-3 py-2 text-xs font-[Courier] uppercase tracking-wider hover:bg-stone-800 ${gameMode === m ? 'text-amber-500 font-bold' : 'text-stone-400'}`}
                   >
                     {m}
                   </button>
                 ))}
               </div>
             )}
          </div>
        </div>
        
        <div className="flex gap-4 sm:gap-8 text-sm font-['Courier_Prime'] border border-red-900/50 bg-stone-950/40 p-3 rounded-md shadow-inner">
          <div className="flex flex-col items-center">
            <span className="text-stone-500 uppercase text-[10px] tracking-wider mb-1">Quota Level</span>
            <span className="text-xl text-stone-200 font-bold">{level}</span>
          </div>
          <div className="w-px bg-stone-700 h-8 self-center"></div>
          <div className="flex flex-col items-center">
            <span className="text-stone-500 uppercase text-[10px] tracking-wider mb-1">Current Yield</span>
            <span className={`text-xl font-bold transition-colors duration-300 ${levelScore > 0 ? 'text-amber-500' : 'text-stone-500'}`}>
              {levelScore}
            </span>
          </div>
          {gameMode === 'CAREER' && (
            <>
              <div className="w-px bg-stone-700 h-8 self-center"></div>
              <div className="flex flex-col items-center">
                <span className="text-stone-500 uppercase text-[10px] tracking-wider mb-1">Total Output</span>
                <span className="text-xl text-amber-500 font-bold">{totalScore}</span>
              </div>
            </>
          )}
        </div>
      </header>

      {/* --- MAIN AREA --- */}
      <main
        className="flex-1 flex flex-col items-center p-4 relative overflow-hidden"
        onClick={handleBackgroundClick}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#78350f_1px,transparent_1px)] [background-size:20px_20px]"></div>

        {/* --- STATUS BAR --- */}
        <div className="mt-8 mb-12 w-full max-w-3xl min-h-[5rem] flex items-center justify-center">
          
          {phase === GamePhase.PLANNING && (
            <div className="bg-stone-800 border border-stone-600 px-6 py-4 rounded shadow-lg text-center max-w-lg transition-all">
              {!selectedTool && (
                <div className="flex items-center gap-3 text-stone-400">
                  <AlertCircle size={20} className="text-amber-500/50" />
                  <span className="font-serif italic text-lg">"Comrade, select a tool to re-educate the sequence."</span>
                </div>
              )}
              {selectedTool && selectedTool !== 'swap' && (
                <span className="text-amber-400 font-bold animate-pulse font-[Courier_Prime] uppercase tracking-wide">
                   Select target for {TOOLS[selectedTool.toUpperCase()].name}
                </span>
              )}
              {selectedTool === 'swap' && !selection && (
                <span className="text-amber-400 font-bold animate-pulse font-[Courier_Prime] uppercase tracking-wide">
                  Select first item to Swap
                </span>
              )}
              {selectedTool === 'swap' && selection !== null && (
                <span className="text-amber-400 font-bold animate-pulse font-[Courier_Prime] uppercase tracking-wide">
                  Select adjacent neighbor
                </span>
              )}
            </div>
          )}

          {phase === GamePhase.INSPECTING && (
            <div className="flex flex-col items-center gap-3 animate-pulse">
              <span className="text-red-500 font-[Cinzel] font-bold tracking-[0.2em] text-2xl border-b-2 border-red-900 pb-2">
                INSPECTION UNDERWAY
              </span>
              <div className="h-6">
                {detectedMode === 'ASC' && (
                  <span className="flex items-center gap-2 text-xs font-bold bg-stone-800 text-amber-500 px-3 py-1 rounded-full border border-amber-900 uppercase fade-in">
                    <TrendingUp size={14} /> Protocol: Ascending
                  </span>
                )}
                {detectedMode === 'DESC' && (
                  <span className="flex items-center gap-2 text-xs font-bold bg-stone-800 text-amber-500 px-3 py-1 rounded-full border border-amber-900 uppercase fade-in">
                    <TrendingDown size={14} /> Protocol: Descending
                  </span>
                )}
              </div>
            </div>
          )}

          {phase === GamePhase.RESULTS && (
            <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
               
               <div className="flex flex-col md:flex-row items-center gap-6 bg-stone-800 p-6 rounded-sm border-2 border-stone-600 shadow-2xl relative">
                  {/* Decor */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-900 px-3 text-stone-500 text-xs font-bold uppercase tracking-widest border border-stone-700 rounded-sm">
                    Report Card
                  </div>

                  <div className="flex flex-col items-center px-4">
                     <span className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Total Yield</span>
                     <span className="text-4xl text-amber-500 font-[Cinzel] font-bold drop-shadow-lg">{levelScore}</span>
                  </div>
                  
                  <div className="w-px h-12 bg-stone-600 hidden md:block"></div>

                  <div className="flex flex-col items-center px-4">
                     <span className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Efficiency</span>
                     <div className="flex items-baseline gap-1">
                       <span className={`text-2xl font-bold font-[Courier_Prime] ${getEfficiency() === 100 ? 'text-green-500' : 'text-stone-300'}`}>
                         {getEfficiency()}%
                       </span>
                       {getEfficiency() === 100 && <Award size={18} className="text-green-500 mb-1" />}
                     </div>
                     <span className="text-[10px] text-stone-600">Target: {optimalScore}</span>
                  </div>

                  {/* Buttons for Daily/Practice */}
                  <div className="flex gap-2">
                    {gameMode === 'DAILY' && (
                      <button
                        onClick={shareResult}
                        className="ml-2 bg-stone-700 hover:bg-stone-600 text-stone-200 p-2 rounded transition-colors"
                        title="Share Result"
                      >
                        <Share2 size={20} />
                      </button>
                    )}

                    {gameMode === 'PRACTICE' && getEfficiency() < 100 && (
                      <button
                        onClick={retryPractice}
                        className="ml-2 bg-stone-700 hover:bg-stone-600 text-stone-200 p-2 rounded transition-colors"
                        title="Retry Level (Same Seed)"
                      >
                        <Repeat size={20} />
                      </button>
                    )}
                  </div>
               </div>

               {gameMode === 'DAILY' && (
                  <div className="mt-4 text-stone-500 text-xs font-serif italic">
                    Come back tomorrow for new orders, comrade.
                  </div>
               )}

            </div>
          )}
        </div>

        {/* --- CARDS GRID --- */}
        <div className="flex-1 flex items-center justify-center w-full">
            {/* If Daily Completed and we are just showing results, we don't necessarily show cards, or we show empty?
                The user didn't specify, but usually if you load a done daily you just see the report.
                But if we just finished it, we see the cards.
                If we loaded from localStorage, list is empty?
                Let's handle the "Loaded from storage" case where list is empty but phase is RESULTS.
            */}
            {list.length > 0 ? (
              <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 max-w-5xl px-4 perspective-[1000px]">
                {list.map((item, idx) => (
                  <Card
                    key={item.id}
                    item={item}
                    onClick={handleCardClick}
                    isSelected={selection === idx}
                    isTargetCandidate={
                      phase === GamePhase.PLANNING &&
                      selectedTool === 'swap' &&
                      selection !== null &&
                      Math.abs(selection - idx) === 1
                    }
                  />
                ))}
              </div>
            ) : (
              gameMode === 'DAILY' && phase === GamePhase.RESULTS && (
                 <div className="text-stone-600 italic font-serif opacity-50">
                    Daily Quota Fulfilled.
                 </div>
              )
            )}
              
            {list.length === 0 && phase === GamePhase.PLANNING && (
              <div className="text-stone-600 italic font-serif animate-pulse">Initializing Sequence...</div>
            )}
        </div>

      </main>

      {/* --- FOOTER CONTROLS --- */}
      <footer className="p-4 border-t-4 border-red-900 bg-stone-900 pb-8 sm:pb-6 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-20">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* Toolbelt */}
          <div
            key={shakeTools}
            className={`flex gap-3 sm:gap-5 ${shakeTools > 0 ? 'shake-animation' : ''}`}
          >
            {TOOLS_DISPLAY_ORDER.map(toolKey => {
              const tool = TOOLS[toolKey.toUpperCase()];
              const isUsed = !toolsAvailable[tool.id as keyof ToolsAvailable];
              const isActive = selectedTool === tool.id;
              const ToolIcon = tool.icon;
              
              return (
                <button
                  key={tool.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToolClick(tool.id);
                  }}
                  disabled={isUsed || phase !== GamePhase.PLANNING}
                  title={tool.desc}
                  className={`
                    relative flex flex-col items-center justify-center w-16 h-16 rounded transition-all duration-200 group overflow-hidden
                    ${isActive 
                      ? 'border-2 border-amber-500 bg-stone-800 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] scale-105' 
                      : isUsed 
                        ? 'border border-stone-800 bg-stone-950 text-stone-700 cursor-not-allowed opacity-60' 
                        : 'border border-stone-600 bg-stone-800 text-stone-400 hover:border-amber-700 hover:text-amber-100 hover:bg-stone-700 hover:-translate-y-1'
                    }
                  `}
                >
                  <ToolIcon size={24} strokeWidth={2.5} />
                  <span className="text-[10px] uppercase font-bold mt-1 tracking-tighter font-[Inter]">{tool.name}</span>
                  
                  {/* Used Stamp */}
                  {isUsed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-950/70 backdrop-blur-[1px]">
                      <div className="text-red-900 font-black uppercase text-[10px] rotate-[-25deg] border-2 border-red-900 px-1 opacity-80">USED</div>
                    </div>
                  )}
                  
                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 animate-ping rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 items-center">
             {/* Unified Action Button */}
             <button
              onClick={phase === GamePhase.RESULTS ? nextLevel : startInspection}
              disabled={
                (phase === GamePhase.PLANNING && list.length === 0) ||
                phase === GamePhase.INSPECTING ||
                (phase === GamePhase.RESULTS && gameMode === 'DAILY') // Disable "Next" for Daily
              }
              className={`
                group relative px-8 py-4 w-72 rounded-sm font-bold flex items-center justify-center gap-3 shadow-lg active:shadow-none active:translate-y-1 transition-all duration-300 font-[Cinzel] tracking-widest text-lg border-2
                ${phase === GamePhase.RESULTS
                  ? (gameMode === 'DAILY' ? 'bg-stone-800 text-stone-500 border-stone-700 shadow-none cursor-not-allowed' : 'bg-amber-700 hover:bg-amber-600 text-stone-950 border-amber-900 shadow-[0_4px_0_rgb(69,26,3)]')
                  : 'bg-red-800 hover:bg-red-700 text-stone-200 border-red-600 shadow-[0_5px_0_rgb(69,10,10)] disabled:opacity-50 disabled:cursor-not-allowed'
                }
                ${phase === GamePhase.INSPECTING ? 'translate-y-1 shadow-none bg-red-900 border-red-800' : ''}
              `}
             >
               {phase === GamePhase.RESULTS ? (
                 <span className="flex items-center gap-3">
                   {gameMode === 'DAILY' ? 'Mission Complete' : 'Next Quota'}
                   {gameMode !== 'DAILY' && <Play size={18} fill="currentColor" />}
                 </span>
               ) : (
                 <>
                   <Star size={20} fill="#f59e0b" className="text-amber-500" />
                   STALIN, SORT!
                 </>
               )}
             </button>
             
             {gameMode !== 'DAILY' && (
                <button
                  onClick={resetGame}
                  className="p-3 text-stone-600 hover:text-red-500 transition-colors border border-transparent hover:border-stone-700 rounded"
                  title="Reset Game"
                >
                  <RotateCcw size={20} />
                </button>
             )}

             <button
              onClick={toggleMusic}
              className={`p-3 transition-colors border border-transparent hover:border-stone-700 rounded ${isPlaying ? 'text-amber-500' : 'text-stone-600 hover:text-amber-500'}`}
              title={isPlaying ? "Mute Music" : "Play Music"}
             >
               {isPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}
             </button>
          </div>
          
        </div>
      </footer>
      
      {/* Help / Rules Overlay (Desktop Only) */}
      <div className="fixed bottom-32 right-6 hidden xl:block pointer-events-none opacity-80">
        <div className="bg-stone-950/90 p-4 rounded-sm border border-stone-700 shadow-2xl backdrop-blur-sm max-w-[200px]">
           <p className="mb-2 text-amber-600 font-[Cinzel] uppercase tracking-wider text-xs border-b border-stone-800 pb-1">Scoring Protocol</p>
           <ul className="text-xs text-stone-400 space-y-2 font-[Courier_Prime]">
             <li><span className="text-amber-500 font-bold">1.</span> First item survives.</li>
             <li><span className="text-amber-500 font-bold">2.</span> Second item sets Mode (Ascending/Descending).</li>
             <li><span className="text-amber-500 font-bold">3.</span> Violators are purged.</li>
             <li><span className="text-amber-500 font-bold">4.</span> Score = Sum of Survivors.</li>
           </ul>
        </div>
      </div>
    </div>
  );
}