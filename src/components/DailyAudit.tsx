import React, { useEffect, useState, useMemo } from 'react';
import { CardItem, Move } from '../../types';
import { generateLevel, generateTools, findOptimalSolution, findWorstSolution, calculateRelativeEfficiency, stringToSeed, Solution, applyMove } from '../utils/gameLogic';
import { CheckCircle, AlertTriangle, ArrowLeft, FileText, ArrowDown } from 'lucide-react';
import SequenceDisplay from './SequenceDisplay';

interface DailyAuditProps {
  date: string;
  userHighScore: number;
  onClose: () => void;
}

interface TimelineStep {
    list: CardItem[];
    move: Move | null;
}

export const DailyAudit: React.FC<DailyAuditProps> = ({ date, userHighScore, onClose }) => {
  const [isCalculating, setIsCalculating] = useState(true);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [worstScore, setWorstScore] = useState<number>(0);
  const [initialList, setInitialList] = useState<CardItem[]>([]);

  useEffect(() => {
    setIsCalculating(true);
    // Use timeout to prevent UI freeze and allow render cycle
    const timer = setTimeout(() => {
      const seed = stringToSeed(date);
      const list = generateLevel(9, seed);
      const tools = generateTools(seed);
      const toolTypes = tools.map(t => t.type);

      const optimal = findOptimalSolution(list, toolTypes);
      const worst = findWorstSolution(list, toolTypes);

      setSolution(optimal);
      setWorstScore(worst.score);
      setInitialList(list);
      setIsCalculating(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [date]);

  // Derive Timeline
  const timeline = useMemo(() => {
      if (!solution || initialList.length === 0) return [];
      
      const steps: TimelineStep[] = [];
      let currentList = initialList.map(i => ({ ...i })); // Deep copy to start

      // 1. Initial State
      // We process moves. Each step is (State Before) -> (Move) -> (State After)
      // Actually, we want to render: State 0, Arrow (Move 0), State 1, Arrow (Move 1), ...
      
      // Push initial state paired with the first move
      // Loop through moves
      for (let i = 0; i < solution.moves.length; i++) {
          const move = solution.moves[i];
          steps.push({
              list: currentList,
              move: move
          });

          // Apply move to get next state
          currentList = applyMove(currentList, move.tool, move.index, move.targetIndex);
      }

      // 2. Final Result State
      steps.push({
          list: currentList,
          move: null
      });

      return steps;
  }, [solution, initialList]);

  if (isCalculating || !solution) {
    return (
      <div className="flex flex-col items-center justify-center p-12 w-full h-full min-h-[50vh]">
        <div className="bg-stone-900/50 border-2 border-amber-900/30 p-8 rounded shadow-xl animate-pulse flex flex-col items-center">
          <FileText className="w-12 h-12 text-amber-500/50 mb-4" />
          <p className="text-amber-500 font-mono text-xl tracking-widest">AUDITING RECORDS...</p>
        </div>
      </div>
    );
  }

  const passed = solution ? userHighScore >= solution.score : false;
  const efficiency = solution
    ? calculateRelativeEfficiency(userHighScore, solution.score, worstScore)
    : 0;

  return (
    <div className="w-full max-w-4xl mx-auto text-stone-100 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Navigation / Header */}
      <div className="flex items-center justify-between border-b-2 border-stone-700 pb-4">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-stone-400 hover:text-amber-500 transition-colors uppercase font-bold tracking-wider text-sm"
        >
          <ArrowLeft size={16} />
          Return to Operations
        </button>
        <div className="text-xs font-mono text-stone-500">
           REF: {stringToSeed(date).toString(16).toUpperCase()}
        </div>
      </div>

      {/* Main Report Card */}
      <div className="w-full max-w-full bg-transparent relative overflow-hidden">
        
        {/* Watermark */}
        <div className="absolute top-0 right-0 p-32 opacity-5 pointer-events-none">
           <FileText className="w-64 h-64 text-stone-100" />
        </div>

        <div className="relative z-10">
          <h1 className="text-3xl font-black uppercase tracking-wide text-amber-500 mb-2 flex items-center gap-3">
             <FileText className="w-8 h-8" />
             Daily Audit: {date}
          </h1>
          <p className="text-stone-400 font-mono text-sm mb-8 max-w-2xl">
            Official performance review of sorting efficiency for the designated cycle.
          </p>

          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
             <div className="bg-stone-900/80 p-5 border border-stone-600 rounded">
                <div className="text-xs uppercase text-stone-500 mb-1">Citizen Yield</div>
                <div className="text-3xl font-bold text-stone-200">{userHighScore}</div>
             </div>
             <div className="bg-stone-900/80 p-5 border border-stone-600 rounded">
                <div className="text-xs uppercase text-stone-500 mb-1">Optimal Yield</div>
                <div className="text-3xl font-bold text-amber-500">{solution.score}</div>
             </div>
             <div className={`bg-stone-900/80 p-5 border rounded flex flex-col justify-center relative overflow-hidden ${passed ? 'border-green-900/50' : 'border-red-900/50'}`}>
                <div className="text-xs uppercase text-stone-500 mb-1">Efficiency Rating</div>
                <div className={`text-3xl font-black ${passed ? 'text-green-500' : 'text-red-500'}`}>
                  {efficiency}%
                </div>
                {/* Stamp */}
                <div className={`absolute top-1/2 right-4 transform -translate-y-1/2 -rotate-12 border-2 text-xs font-black px-2 py-1 opacity-50 select-none pointer-events-none
                   ${passed ? 'border-green-600 text-green-600' : 'border-red-600 text-red-600'}`}>
                   {passed ? 'PASSED' : 'FAIL'}
                </div>
             </div>
          </div>

          {passed ? (
             <div className="bg-green-900/20 border border-green-900/30 p-6 rounded flex items-center gap-4">
               <CheckCircle className="w-10 h-10 text-green-500" />
               <div>
                 <h3 className="text-green-500 font-bold uppercase tracking-wide">Audit Passed</h3>
                 <p className="text-green-200/50 text-sm">No infractions detected. Productivity within acceptable parameters.</p>
               </div>
             </div>
          ) : (
            <div className="flex flex-col gap-12 mt-8 w-full">
                <div className="bg-red-950/30 border border-red-900/50 px-6 py-3 rounded inline-flex items-center gap-3 text-red-500 mb-8 self-start">
                    <AlertTriangle size={24} />
                    <h3 className="uppercase font-bold tracking-wide text-lg">Corrective Action Plan</h3>
                </div>

                <div className="flex flex-col gap-0 items-center w-full">
                    {timeline.map((step, idx) => {
                        // Determine highlights based on the NEXT move (if current step has a move)
                        const highlightIndices = step.move 
                            ? [step.move.index, step.move.targetIndex].filter(x => x !== undefined) as number[]
                            : [];

                        return (
                            <React.Fragment key={idx}>
                                {/* Board State */}
                                <div className="w-full flex flex-col items-center">
                                    <div className="text-xs text-stone-500 uppercase tracking-widest mb-6 w-full text-left">
                                        {idx === 0 ? "Initial State" : (step.move === null ? "Optimized State" : `Phase ${idx}`)}
                                    </div>
                                    <SequenceDisplay
                                        sequence={step.list}
                                        highlightIndices={highlightIndices}
                                    />
                                </div>

                                {/* Arrow / Action */}
                                {step.move && (
                                    <div className="flex flex-col items-center my-2 z-10">
                                        <div className="h-6 w-px bg-stone-600"></div>
                                        <div className="bg-stone-800 border border-stone-600 text-stone-300 px-4 py-2 rounded-full text-sm font-mono shadow-xl flex items-center gap-3">
                                            <span className="text-amber-500 font-bold uppercase tracking-wider">{step.move.tool}</span>
                                            <span className="text-stone-500">
                                              {(() => {
                                                  const isAdjacent = ['swap', 'merge', 'sink', 'cycle'].includes(step.move.tool);
                                                  if (isAdjacent && step.move.targetIndex === undefined) {
                                                      return `Index ${step.move.index} & ${step.move.index + 1}`;
                                                  }
                                                  if (step.move.targetIndex !== undefined) {
                                                      return `${step.move.index} ↔ ${step.move.targetIndex}`;
                                                  }
                                                  return `Index ${step.move.index}`;
                                              })()}
                                            </span>
                                        </div>
                                        <div className="h-6 w-px bg-stone-600"></div>
                                        <ArrowDown className="text-stone-600 -mt-2" size={16} />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}

                    <button 
                        onClick={onClose}
                        className="group relative px-8 py-4 w-72 rounded-sm font-bold flex items-center justify-center gap-3 shadow-lg active:shadow-none active:translate-y-1 transition-all duration-300 font-[Cinzel] tracking-widest text-lg border-2 bg-amber-700 hover:bg-amber-600 text-stone-950 border-amber-900 shadow-[0_4px_0_rgb(69,26,3)] mx-auto mt-12 mb-20"
                    >
                        <CheckCircle size={24} className="text-stone-900/80" />
                        COMPLIANCE ACCEPTED
                    </button>
                </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
