import React, { useState } from 'react';
import { Star, ChevronDown, TrendingUp, TrendingDown, Award, Share2, Repeat } from 'lucide-react';
import { GameMode, GamePhase } from '../../types';

interface HeaderProps {
  level: number;
  levelScore: number;
  totalScore: number;
  gameMode: GameMode;
  phase: GamePhase;
  optimalScore: number | null;
  detectedMode: 'ASC' | 'DESC' | null;
  onChangeMode: (mode: GameMode) => void;
  onShareResult: () => void;
  onRetryPractice: () => void;
}

const Header: React.FC<HeaderProps> = ({
  level, levelScore, totalScore, gameMode,
  phase, optimalScore, detectedMode,
  onChangeMode, onShareResult, onRetryPractice
}) => {
  const [showModeMenu, setShowModeMenu] = useState(false);

  return (
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
                   onClick={() => {
                     onChangeMode(m);
                     setShowModeMenu(false);
                   }}
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
  );
};

export default Header;
