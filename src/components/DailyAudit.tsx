import React, { useEffect, useState } from 'react';
import { CardItem, ToolType, Move } from '../../types';
import { generateLevel, generateTools, findOptimalSolution, stringToSeed, Solution } from '../utils/gameLogic';
import { CheckCircle, AlertTriangle, X, ArrowRight, FileText } from 'lucide-react';
import Card from './Card';

interface DailyAuditProps {
  date: string;
  userHighScore: number;
  onClose: () => void;
}

export const DailyAudit: React.FC<DailyAuditProps> = ({ date, userHighScore, onClose }) => {
  const [isCalculating, setIsCalculating] = useState(true);
  const [solution, setSolution] = useState<Solution | null>(null);
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
      setSolution(optimal);
      setInitialList(list);
      setIsCalculating(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [date]);

  if (isCalculating || !solution) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-stone-900 border-2 border-amber-900/50 p-8 rounded shadow-2xl animate-pulse">
          <p className="text-amber-500 font-mono text-xl">AUDITING RECORDS...</p>
        </div>
      </div>
    );
  }

  const passed = userHighScore >= solution.score;
  const efficiency = solution.score > 0
    ? Math.round((userHighScore / solution.score) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-stone-900 border-2 border-stone-600 w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh] text-stone-100">

        {/* Header - Bureaucratic Style */}
        <div className="bg-stone-800 p-4 border-b-2 border-stone-600 flex items-center justify-between">
          <div>
              <h2 className="text-xs font-mono text-stone-400 tracking-widest uppercase mb-1">Bureau of Efficiency // Audit Report</h2>
              <h1 className="text-2xl font-black uppercase tracking-wide text-amber-500 flex items-center gap-2">
                 <FileText className="w-6 h-6" />
                 {date}
              </h1>
          </div>
          <div className="text-xs font-mono text-stone-500 text-right">
             <div>REF: {stringToSeed(date).toString(16).toUpperCase()}</div>
             <div>SEC: LEVEL-1</div>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto font-mono custom-scrollbar">

          {/* Scores */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-stone-800 p-3 border-l-4 border-stone-500">
              <div className="text-xs uppercase text-stone-400 mb-1">Citizen Yield</div>
              <div className="text-2xl font-bold text-stone-100">{userHighScore}</div>
            </div>
            <div className="bg-stone-800 p-3 border-l-4 border-amber-500">
              <div className="text-xs uppercase text-stone-400 mb-1">Optimal Yield</div>
              <div className="text-2xl font-bold text-amber-500">{solution.score}</div>
            </div>
          </div>

          {/* Verdict */}
          <div className="flex flex-col items-center justify-center mb-8 p-6 border-2 border-dashed border-stone-700 bg-black/20 relative overflow-hidden min-h-[160px]">
            <div className="text-sm text-stone-500 uppercase tracking-widest mb-2">Efficiency Rating</div>
            <div className={`text-5xl font-black ${passed ? 'text-green-500' : 'text-red-500'} z-10`}>
              {efficiency}%
            </div>

            {/* Stamp Overlay */}
            <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-12 border-4 text-4xl font-black px-4 py-2 opacity-80 select-none pointer-events-none whitespace-nowrap z-20
              ${passed ? 'border-green-600 text-green-600' : 'border-red-600 text-red-600'}`}>
              {passed ? 'AUDIT PASSED' : 'PROBATION'}
            </div>
          </div>

          {/* Solution Reveal (Only on Failure) */}
          {!passed && (
            <div className="mb-8 animate-in fade-in duration-500">
              <div className="flex items-center gap-2 mb-4 text-red-500 border-b border-red-900/30 pb-1">
                <AlertTriangle size={18} />
                <h3 className="uppercase font-bold tracking-wide text-sm">Corrective Action Plan</h3>
              </div>

              {/* Initial Sequence Visualization */}
              <div className="mb-4">
                  <div className="text-xs text-stone-500 uppercase mb-2">Initial Sequence</div>
                  <div className="flex flex-wrap justify-center gap-1 opacity-80 scale-90 origin-top">
                      {initialList.map((item) => (
                          <div key={item.id} className="transform scale-75 origin-center">
                              <Card
                                item={item}
                                onClick={() => {}}
                                isSelected={false}
                                isTargetCandidate={false}
                              />
                          </div>
                      ))}
                  </div>
              </div>

              {/* Moves List */}
              <div className="bg-stone-900 p-4 rounded text-sm space-y-2 border border-stone-800">
                 {solution.moves.length === 0 ? (
                     <div className="text-stone-500 italic">No moves required.</div>
                 ) : (
                    solution.moves.map((move, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-stone-300">
                        <span className="text-stone-500 w-6 font-bold">{idx + 1}.</span>
                        <div>
                        <span className="text-amber-500 font-bold uppercase mr-2">{move.tool}</span>
                        <span className="text-stone-400">
                            Index {move.index}
                            {move.targetIndex !== undefined && (
                                <> <ArrowRight className="inline mx-1 w-3 h-3" /> Target {move.targetIndex}</>
                            )}
                        </span>
                        </div>
                    </div>
                    ))
                 )}
              </div>
            </div>
          )}

          {passed && (
             <div className="text-center text-stone-500 text-sm italic mb-8">
               <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600/50" />
               No infractions detected. Productivity within acceptable parameters.
             </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-stone-800 p-4 border-t-2 border-stone-600 flex justify-end">
          <button
            onClick={onClose}
            className="bg-stone-700 hover:bg-stone-600 text-stone-200 font-bold py-2 px-6 uppercase tracking-wider text-sm transition-colors flex items-center gap-2 border border-stone-500"
          >
            <X size={16} />
            Compliance Acknowledged
          </button>
        </div>
      </div>
    </div>
  );
};
