import React, { useState } from 'react';
import { Star, ChevronDown, Volume2, VolumeX, TrendingUp, TrendingDown, Award, Share2, Repeat } from 'lucide-react';
import { GameMode, GamePhase } from '../../types';

interface HeaderProps {
  level: number;
  levelScore: number;
  totalScore: number;
  totalOptimalScore: number;
  gameMode: GameMode;
  phase: GamePhase;
  optimalScore: number | null;
  detectedMode: 'ASC' | 'DESC' | null;
  isPlaying: boolean;
  onToggleMusic: () => void;
  onChangeMode: (mode: GameMode) => void;
  onShareResult: () => void;
  onRetryPractice: () => void;
}

const Header: React.FC<HeaderProps> = ({
  level, levelScore, totalScore, totalOptimalScore, gameMode,
  phase, optimalScore, detectedMode, isPlaying, onToggleMusic,
  onChangeMode, onShareResult, onRetryPractice
}) => {
  const [showModeMenu, setShowModeMenu] = useState(false);

  const totalEfficiency = totalOptimalScore > 0
    ? Math.round((totalScore / totalOptimalScore) * 100)
    : 0;

  return (
    <header className="px-6 py-4 border-b-4 border-red-900 bg-gradient-to-r from-red-950 to-stone-900 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 z-10 sticky top-0">
      <div className="flex flex-col items-center md:items-start">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Star className="text-amber-500 fill-amber-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" size={32} />
            <div className="absolute inset-0 blur-sm bg-amber-500/30 rounded-full"></div>
          </div>
          <h1 className="text-xl sm:text-3xl font-[Cinzel] font-bold text-amber-500 tracking-widest uppercase drop-shadow-md whitespace-nowrap">
            The Great Sort
          </h1>
        </div>

        <div className="flex items-center gap-6 mt-2 ml-1 z-50">
           {/* Mode Selector */}
           <div className="relative">
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

           {/* Sound Toggle */}
           <button
             onClick={onToggleMusic}
             className={`flex items-center gap-2 text-[12px] font-[Courier] uppercase tracking-[0.2em] transition-colors ${isPlaying ? 'text-amber-500' : 'text-stone-400 hover:text-amber-500'}`}
             title={isPlaying ? "Mute Music" : "Play Music"}
           >
             Sound {isPlaying ? <Volume2 size={14} /> : <VolumeX size={14} />}
           </button>
        </div>
      </div>

      {gameMode === 'CAREER' && (
        <div className="flex gap-4 sm:gap-8 text-sm font-['Courier_Prime'] border border-red-900/50 bg-stone-950/40 p-3 rounded-md shadow-inner">
          <div className="flex flex-col items-center">
            <span className="text-stone-500 uppercase text-[10px] tracking-wider mb-1">Day</span>
            <span className="text-xl text-stone-200 font-bold">{level}</span>
          </div>
          <div className="w-px bg-stone-700 h-8 self-center"></div>
          <div className="flex flex-col items-center">
            <span className="text-stone-500 uppercase text-[10px] tracking-wider mb-1">Overall Eff.</span>
            <span className={`text-xl font-bold ${totalEfficiency >= 100 ? 'text-amber-500' : 'text-stone-300'}`}>
              {totalEfficiency}%
            </span>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
