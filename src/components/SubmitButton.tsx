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
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  phase,
  gameMode,
  listLength,
  onActionClick,
  disabled,
  isLocked,
  compact = false
}) => {
  const isRetry = phase === GamePhase.RESULTS && gameMode === 'DAILY';

  return (
    <button
      onClick={onActionClick}
      title={phase === GamePhase.RESULTS ? (gameMode === 'DAILY' ? (isLocked ? 'Training' : 'Retry Daily') : 'Next Level') : 'Inspect Sequence'}
      disabled={
        (disabled && isLocked && phase !== GamePhase.RESULTS) // Disable if locked and NOT in results (shouldn't happen in Daily Results but good safety)
      }
      className={`
        group relative rounded-sm font-bold flex items-center justify-center transition-all duration-300 border-2
        ${compact 
           ? 'w-16 h-16 p-1 flex-col gap-0.5 rounded shadow-sm' 
           : 'px-8 py-4 w-72 gap-3 font-[Cinzel] tracking-widest text-lg shadow-lg active:shadow-none active:translate-y-1'
        }
        ${phase === GamePhase.RESULTS
          ? (isRetry
              ? 'bg-amber-700 hover:bg-amber-600 text-stone-950 border-amber-900 shadow-[0_4px_0_rgb(69,26,3)]'
              : 'bg-amber-700 hover:bg-amber-600 text-stone-950 border-amber-900 shadow-[0_4px_0_rgb(69,26,3)]')
          : 'bg-red-800 hover:bg-red-700 text-stone-200 border-red-600 shadow-[0_5px_0_rgb(69,10,10)] disabled:opacity-50 disabled:cursor-not-allowed'
        }
        ${phase === GamePhase.INSPECTING ? 'translate-y-1 shadow-none bg-red-900 border-red-800' : ''}
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
          <SearchCode size={compact ? 24 : 24} className="text-white" />
          {compact && (
             <span className="text-[9px] uppercase font-bold leading-none text-center mt-0.5">
               Inspect
             </span>
          )}
          {!compact && "Inspector"}
        </>
      )}
    </button>
  );
};

export default SubmitButton;
