import React from 'react';
import { Play, Star } from 'lucide-react';
import { GamePhase, GameMode } from '../../types';

interface SubmitButtonProps {
  phase: GamePhase;
  gameMode: GameMode;
  listLength: number;
  onActionClick: () => void;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  phase,
  gameMode,
  listLength,
  onActionClick
}) => {
  return (
    <button
      onClick={onActionClick}
      disabled={
        (phase === GamePhase.PLANNING && listLength === 0) ||
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
  );
};

export default SubmitButton;
