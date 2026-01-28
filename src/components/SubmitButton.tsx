import React from 'react';
import { Play, SearchCode, Repeat } from 'lucide-react';
import { GamePhase, GameMode } from '../../types';

interface SubmitButtonProps {
  phase: GamePhase;
  gameMode: GameMode;
  listLength: number;
  onActionClick: () => void;
  disabled?: boolean;
  isLocked?: boolean;
  compact?: boolean;
  efficiency?: number | null;
  glitchLevel?: 0 | 1 | 2;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  phase,
  gameMode,
  listLength,
  onActionClick,
  disabled,
  isLocked,
  compact = false,
  efficiency = null,
  glitchLevel = 0
}) => {
  const isRetry = phase === GamePhase.RESULTS && gameMode === 'DAILY';

  // Determine base styles based on Efficiency (only in PLANNING phase)
  let bgClass = "bg-red-800 hover:bg-red-700 text-stone-200 border-red-600 shadow-[0_5px_0_rgb(69,10,10)]";

  if (phase === GamePhase.RESULTS) {
      bgClass = "bg-amber-700 hover:bg-amber-600 text-stone-950 border-amber-900 shadow-[0_4px_0_rgb(69,26,3)]";
  } else if (phase === GamePhase.INSPECTING) {
      bgClass = "translate-y-1 shadow-none bg-red-900 border-red-800 text-stone-400";
  } else if (efficiency !== null) {
      // Compliance Coloring
      if (efficiency === 100) {
          bgClass = "bg-amber-400 hover:bg-amber-300 text-amber-900 border-amber-200 shadow-[0_5px_0_rgb(180,83,9)] shadow-amber-500/50 animate-pulse";
      } else if (efficiency >= 95) {
          bgClass = "bg-amber-500 hover:bg-amber-400 text-amber-950 border-amber-300 shadow-[0_5px_0_rgb(146,64,14)]";
      } else if (efficiency >= 90) {
          bgClass = "bg-slate-400 hover:bg-slate-300 text-slate-900 border-slate-300 shadow-[0_5px_0_rgb(71,85,105)]";
      }
  }

  // Glitch Logic
  const glitchStyle = glitchLevel > 0 ? {
      animation: glitchLevel === 1 ? 'erratic-1 3s infinite' : 'erratic-2 0.5s infinite',
  } : {};

  return (
    <>
    {/* Glitch Animations */}
    <style>{`
      @keyframes erratic-1 {
        0%, 100% { transform: translate(0, 0); }
        10% { transform: translate(-2px, 1px); }
        20% { transform: translate(1px, -2px); }
        30% { transform: translate(-2px, -1px); }
        40% { transform: translate(2px, 2px); }
        50% { transform: translate(-1px, 1px); }
      }
      @keyframes erratic-2 {
        0% { transform: translate(2px, -2px) skew(2deg); filter: hue-rotate(90deg); }
        25% { transform: translate(-2px, 2px) skew(-2deg); }
        50% { transform: translate(2px, 2px) skew(1deg); filter: invert(1); }
        75% { transform: translate(-2px, -2px) skew(-1deg); }
        100% { transform: translate(0, 0); }
      }
    `}</style>

    <button
      onClick={onActionClick}
      title={phase === GamePhase.RESULTS ? (gameMode === 'DAILY' ? (isLocked ? 'Training' : 'Retry Daily') : 'Next Level') : 'Inspect Sequence'}
      disabled={
        (disabled && isLocked && phase !== GamePhase.RESULTS)
      }
      style={phase === GamePhase.PLANNING ? glitchStyle : undefined}
      className={`
        group relative rounded-sm font-bold flex items-center justify-center transition-all duration-300 border-2
        ${compact 
           ? 'w-16 h-16 p-1 flex-col gap-0.5 rounded shadow-sm' 
           : 'px-8 py-4 w-72 gap-3 font-[Cinzel] tracking-widest text-lg shadow-lg active:shadow-none active:translate-y-1'
        }
        ${bgClass}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {phase === GamePhase.RESULTS ? (
        <>
           {gameMode === 'DAILY' 
              ? (isLocked ? <Play size={compact ? 24 : 24} fill="currentColor" /> : <Repeat size={compact ? 24 : 24} />)
              : <Play size={compact ? 24 : 24} fill="currentColor" />}
           
           {compact && (
              <span className="text-[9px] uppercase font-bold leading-none text-center">
                 {gameMode === 'DAILY' ? (isLocked ? 'Train' : 'Retry') : 'Next'}
              </span>
           )}
           
           {!compact && (
               <span className="flex items-center gap-3">
                 {gameMode === 'DAILY' ? (isLocked ? 'Training' : 'Retry Quota') : 'Next Quota'}
               </span>
           )}
        </>
      ) : (
        <>
          <SearchCode size={compact ? 24 : 24} className={efficiency && efficiency >= 90 ? "text-current" : "text-white"} />
          {compact && (
             <span className="text-[9px] uppercase font-bold leading-none text-center mt-0.5">
               Inspect
             </span>
          )}
          {!compact && "Inspector"}
        </>
      )}
    </button>
    </>
  );
};

export default SubmitButton;
