import React from 'react';
import { Award, Share2, Repeat } from 'lucide-react';
import { GameMode } from '../../types';
import { calculateRelativeEfficiency } from '../utils/gameLogic';

interface ReportCardProps {
  levelScore: number;
  optimalScore: number | null;
  worstScore: number | null;
  gameMode: GameMode;
  onShareResult: () => void;
  onRetryPractice: () => void;
  onViewAudit: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({
  levelScore,
  optimalScore,
  worstScore,
  gameMode,
  onShareResult,
  onRetryPractice,
  onViewAudit
}) => {
  const [showHint, setShowHint] = React.useState(false);

  const getEfficiency = () => {
    if (!optimalScore) return 0;
    if (gameMode === 'DAILY' && worstScore !== null) {
      return calculateRelativeEfficiency(levelScore, optimalScore, worstScore);
    }
    return Math.min(100, Math.round((levelScore / optimalScore) * 100));
  };

  return (
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
          {gameMode === 'DAILY' ? (
            <>
              <span className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Efficiency</span>
              {optimalScore === null ? (
                <div className="text-stone-400 text-xs font-mono text-center max-w-[200px] leading-relaxed">
                  <span className="block text-amber-600 font-bold uppercase tracking-wider mb-1">Calculating...</span>
                </div>
              ) : !showHint ? (
                  <button 
                    onClick={() => setShowHint(true)}
                    className="text-stone-400 text-xs font-mono underline hover:text-amber-500 transition-colors"
                  >
                    Reveal Target
                  </button>
              ) : (
                <div className="flex items-baseline gap-1 animate-in fade-in">
                  <span className={`text-2xl font-bold font-[Courier_Prime] ${getEfficiency() === 100 ? 'text-green-500' : 'text-stone-300'}`}>
                    {getEfficiency()}%
                  </span>
                  {getEfficiency() === 100 && <Award size={18} className="text-green-500 mb-1" />}
                </div>
              )}
            </>
          ) : (
            <>
              <span className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Efficiency</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold font-[Courier_Prime] ${getEfficiency() === 100 ? 'text-green-500' : 'text-stone-300'}`}>
                  {getEfficiency()}%
                </span>
                {getEfficiency() === 100 && <Award size={18} className="text-green-500 mb-1" />}
              </div>
              <span className="text-amber-500 font-bold text-xl mt-1">Target: {optimalScore}</span>
            </>
          )}
        </div>

        {/* Buttons for Daily */}
        <div className="flex gap-2">
          {gameMode === 'DAILY' && (
             <button
                onClick={onViewAudit}
                className="ml-2 bg-amber-600 hover:bg-amber-500 text-stone-900 border border-amber-700 px-4 py-2 rounded font-bold uppercase tracking-wider text-xs shadow-lg transition-all active:translate-y-0.5"
             >
               Submit to Audit
             </button>
          )}
        </div>
      </div>

      {gameMode === 'PRACTICE' && getEfficiency() < 100 && (
        <div className="mt-4 flex flex-col items-center">
          <button
            onClick={onRetryPractice}
            className="bg-stone-700 hover:bg-stone-600 text-stone-200 px-6 py-2 rounded transition-colors font-bold uppercase tracking-wider text-sm flex items-center gap-2"
          >
            <Repeat size={16} /> Retry Level
          </button>
        </div>
      )}

      {gameMode === 'DAILY' && optimalScore !== null && showHint && (
        <div className="mt-4 text-stone-500 text-xs font-serif italic animate-in fade-in">
          {getEfficiency() === 100
            ? "Quota Met perfectly."
            : "Reviewing performance protocol..."}
        </div>
      )}

    </div>
  );
};

export default ReportCard;
