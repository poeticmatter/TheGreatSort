import React, { useState } from 'react';
import { Award, Repeat } from 'lucide-react';
import { GameMode } from '../../types';
import { calculateRelativeEfficiency } from '../utils/gameLogic';

interface ReportCardProps {
  levelScore: number;
  optimalScore: number | null;
  worstScore: number | null;
  gameMode: GameMode;
  onRetryPractice: () => void;
  onViewAudit: () => void;
  isLocked?: boolean;
}

const ReportCard: React.FC<ReportCardProps> = ({
  levelScore,
  optimalScore,
  worstScore,
  gameMode,
  onRetryPractice,
  onViewAudit,
  isLocked
}) => {
  const [showTarget, setShowTarget] = useState(false);

  const getAdherence = () => {
    if (!optimalScore) return 0;
    if (gameMode === 'DAILY' && worstScore !== null) {
      return calculateRelativeEfficiency(levelScore, optimalScore, worstScore);
    }
    return Math.min(100, Math.round((levelScore / optimalScore) * 100));
  };

  const adherence = getAdherence();

  return (
    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">

      <div className="relative w-full max-w-md">
        {/* Label */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-900 px-3 text-stone-500 text-xs font-bold uppercase tracking-widest border border-stone-700 rounded-sm z-10">
          Report Card
        </div>

        {/* Card Container */}
        <div className="flex flex-col md:flex-row items-stretch gap-0 bg-stone-800 rounded-sm border-2 border-stone-600 shadow-2xl relative overflow-hidden w-full">
          
          {/* Decor Header */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-stone-700/50"></div>

          {/* Total Yield Section */}
          <div className="flex flex-col items-center justify-center p-6 min-w-[140px] bg-stone-800/50">
            <span className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Total Yield</span>
            <span className="text-4xl text-amber-500 font-[Cinzel] font-bold drop-shadow-lg">{levelScore}</span>
          </div>

          <div className="w-px bg-stone-600 hidden md:block self-stretch"></div>

          {/* Adherence & Controls Section */}
          <div className="flex flex-col p-6 gap-6 min-w-[300px] flex-1">
            
            {/* Adherence Bar */}
            <div className="flex flex-col w-full">
              <div className="flex justify-between items-end mb-1">
                 <span className="text-[10px] text-stone-500 uppercase tracking-widest">Adherence</span>
                 <span className={`text-sm font-bold font-mono ${adherence === 100 ? 'text-green-500' : 'text-stone-300'}`}>{adherence}%</span>
              </div>
              
              <div className="w-full h-3 bg-stone-700 rounded-full overflow-hidden border border-stone-600 relative">
                 <div 
                    className="h-full bg-amber-500 transition-all duration-1000 ease-out"
                    style={{ width: `${adherence}%` }}
                 ></div>
              </div>

              <div className="flex justify-between mt-1 text-[9px] text-stone-600 font-bold uppercase tracking-widest px-1">
                <span>Anarchy</span>
                <span>Order</span>
              </div>
            </div>

            <div className="h-px bg-stone-700 w-full"></div>

            {/* Bottom Row: Target & Action */}
            <div className="flex justify-between items-center gap-4">
              
              {/* Optimal Yield Display */}
              <div className="flex flex-col">
                 <span className="text-[9px] text-stone-500 uppercase tracking-widest mb-0.5">Optimal Yield</span>
                 {gameMode === 'DAILY' ? (
                    optimalScore === null ? (
                       <span className="text-xs text-stone-500 animate-pulse">Calculating...</span>
                    ) : showTarget ? (
                       <span className="text-lg font-bold text-stone-300 font-[Cinzel] animate-in fade-in">{optimalScore}</span>
                    ) : (
                       <button 
                         onClick={() => setShowTarget(true)}
                         className="text-xs text-amber-600 hover:text-amber-500 underline font-mono text-left"
                       >
                         Reveal Target
                       </button>
                    )
                 ) : (
                    <span className="text-lg font-bold text-stone-300 font-[Cinzel]">{optimalScore}</span>
                 )}
              </div>

              {/* Daily Action Button */}
              {gameMode === 'DAILY' && (
                  <button
                      onClick={onViewAudit}
                      className="bg-amber-700 hover:bg-amber-600 text-stone-900 border border-amber-800 px-4 py-2 rounded font-bold uppercase tracking-wider text-[10px] shadow-md transition-all active:translate-y-0.5 whitespace-nowrap"
                  >
                      {isLocked ? 'Review Audit' : 'Submit to Audit'}
                  </button>
              )}

            </div>

          </div>
        </div>
      </div>

      {gameMode === 'PRACTICE' && adherence < 100 && (
        <div className="mt-4 flex flex-col items-center">
          <button
            onClick={onRetryPractice}
            className="bg-stone-700 hover:bg-stone-600 text-stone-200 px-6 py-2 rounded transition-colors font-bold uppercase tracking-wider text-sm flex items-center gap-2"
          >
            <Repeat size={16} /> Retry Training
          </button>
        </div>
      )}

      {gameMode === 'DAILY' && optimalScore !== null && showTarget && (
        <div className="mt-4 text-stone-500 text-xs font-serif italic animate-in fade-in">
          {adherence === 100
            ? "Quota Met perfectly."
            : "Inefficiency detected. Compliance is mandatory."}
        </div>
      )}

    </div>
  );
};

export default ReportCard;
