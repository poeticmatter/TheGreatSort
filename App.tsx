import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeftToLine, ArrowRightToLine, Trash2, ArrowRightLeft, 
  Play, RotateCcw, TrendingUp, TrendingDown, Star, AlertCircle, Award 
} from 'lucide-react';
import Card from './components/Card';
import { CardItem, GamePhase, ToolDefinition, ToolsAvailable } from './types';
import { generateLevel, findOptimalScore } from './utils/gameLogic';

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

  // --- Refs ---
  const inspectionIndex = useRef(0);
  const lastSurvivorVal = useRef<number | null>(null);
  const sortDirection = useRef<'ASC' | 'DESC' | null>(null); 
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Initialization & Effects ---
  useEffect(() => {
    startLevel(1);
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

  const startLevel = (lvl: number) => {
    setLevel(lvl);
    setList(generateLevel(lvl));
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

  const handleToolClick = (toolId: string) => {
    if (phase !== GamePhase.PLANNING) return;
    if (!toolsAvailable[toolId as keyof ToolsAvailable]) return;

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
    if (!selectedTool) return;

    const index = list.findIndex(i => i.id === item.id);
    const newList = [...list];

    if (selectedTool === 'purge') {
      newList.splice(index, 1);
      commitMove(newList, 'purge');
    } 
    else if (selectedTool === 'demote') {
      // Demote moves to START
      const [moved] = newList.splice(index, 1);
      newList.unshift(moved);
      commitMove(newList, 'demote');
    }
    else if (selectedTool === 'promote') {
      // Promote moves to END
      const [moved] = newList.splice(index, 1);
      newList.push(moved);
      commitMove(newList, 'promote');
    }
    else if (selectedTool === 'swap') {
      if (selection === null) {
        setSelection(index);
      } else {
        if (Math.abs(selection - index) === 1) {
          // Valid neighbor swap
          [newList[selection], newList[index]] = [newList[index], newList[selection]];
          commitMove(newList, 'swap');
        } else if (selection === index) {
          // Deselect
          setSelection(null);
        } else {
          // Switch selection
          setSelection(index);
        }
      }
    }
  };

  const commitMove = (newList: CardItem[], toolId: string) => {
    setList(newList);
    setToolsAvailable(prev => ({ ...prev, [toolId]: false }));
    setSelectedTool(null);
    setSelection(null);
    // Reset optimal score calculation as state changed
    setOptimalScore(null);
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
      setList(prevList => {
        const newList = [...prevList];
        const currentItem = newList[idx];
        const currentVal = currentItem.val;
        
        let survived = false;
        let pointsToAdd = 0;

        // Evaluation Logic
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

          newList[idx] = { 
            ...currentItem, 
            status: 'safe', 
            linkScore: pointsToAdd
          };
          
          setLevelScore(prev => prev + pointsToAdd);
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
  };

  const nextLevel = () => {
    startLevel(level + 1);
  };
  
  const resetGame = () => {
    setTotalScore(0);
    startLevel(1);
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
          <p className="text-[10px] text-stone-400 font-[Courier] uppercase tracking-[0.3em] mt-1 ml-1">
            People's Commissariat of Order
          </p>
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
          <div className="w-px bg-stone-700 h-8 self-center"></div>
          <div className="flex flex-col items-center">
            <span className="text-stone-500 uppercase text-[10px] tracking-wider mb-1">Total Output</span>
            <span className="text-xl text-amber-500 font-bold">{totalScore}</span>
          </div>
        </div>
      </header>

      {/* --- MAIN AREA --- */}
      <main className="flex-1 flex flex-col items-center p-4 relative overflow-hidden">
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
               </div>

               <button 
                onClick={nextLevel}
                className="mt-8 group relative bg-amber-700 hover:bg-amber-600 text-stone-950 px-10 py-3 rounded-sm font-bold shadow-[0_4px_0_rgb(69,26,3)] active:shadow-none active:translate-y-1 transition-all font-[Cinzel] uppercase tracking-widest text-lg border-2 border-amber-900"
               >
                 <span className="flex items-center gap-3">
                   Next Quota <Play size={18} fill="currentColor" />
                 </span>
               </button>
            </div>
          )}
        </div>

        {/* --- CARDS GRID --- */}
        <div className="flex-1 flex items-center justify-center w-full">
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
              
              {list.length === 0 && phase === GamePhase.PLANNING && (
                <div className="text-stone-600 italic font-serif animate-pulse">Initializing Sequence...</div>
              )}
            </div>
        </div>

      </main>

      {/* --- FOOTER CONTROLS --- */}
      <footer className="p-4 border-t-4 border-red-900 bg-stone-900 pb-8 sm:pb-6 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-20">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* Toolbelt */}
          <div className="flex gap-3 sm:gap-5">
            {TOOLS_DISPLAY_ORDER.map(toolKey => {
              const tool = TOOLS[toolKey.toUpperCase()];
              const isUsed = !toolsAvailable[tool.id as keyof ToolsAvailable];
              const isActive = selectedTool === tool.id;
              const ToolIcon = tool.icon;
              
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
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
             {phase === GamePhase.PLANNING && (
               <button
                onClick={startInspection}
                disabled={list.length === 0}
                className="bg-red-800 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-stone-200 px-8 py-4 rounded-sm font-bold flex items-center gap-3 shadow-[0_5px_0_rgb(69,10,10)] active:shadow-none active:translate-y-1 transition-all border border-red-600 font-[Cinzel] tracking-widest text-lg"
               >
                 <Star size={20} fill="#f59e0b" className="text-amber-500" />
                 STALIN, SORT!
               </button>
             )}
             
             <button 
              onClick={resetGame}
              className="p-3 text-stone-600 hover:text-red-500 transition-colors border border-transparent hover:border-stone-700 rounded"
              title="Reset Game"
             >
               <RotateCcw size={20} />
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