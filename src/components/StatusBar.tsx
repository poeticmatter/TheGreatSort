import React from 'react';
import {
  AlertCircle, TrendingUp, TrendingDown, Award, Share2, Repeat,
  ArrowLeftToLine, ArrowRightToLine, Trash2, ArrowRightLeft
} from 'lucide-react';
import { GamePhase, GameMode, ToolDefinition } from '../../types';

// Duplicated for now to access names, or we can export from elsewhere.
// Ideally should be passed in or defined in a shared constant.
const TOOLS: Record<string, ToolDefinition> = {
  DEMOTE: { id: 'demote', name: 'Demote', icon: ArrowLeftToLine, desc: 'Move item to the start (Left)' },
  SWAP: { id: 'swap', name: 'Swap', icon: ArrowRightLeft, desc: 'Switch two adjacent items' },
  PURGE: { id: 'purge', name: 'Purge', icon: Trash2, desc: 'Eliminate one item' },
  PROMOTE: { id: 'promote', name: 'Promote', icon: ArrowRightToLine, desc: 'Move item to the end (Right)' },
};

interface StatusBarProps {
  phase: GamePhase;
  selectedTool: string | null;
  selection: number | null;
  detectedMode: 'ASC' | 'DESC' | null;
  levelScore: number;
  optimalScore: number | null;
  gameMode: GameMode;
  onShareResult: () => void;
  onRetryPractice: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({
  phase, selectedTool, selection, detectedMode, levelScore, optimalScore, gameMode,
  onShareResult, onRetryPractice
}) => {

  const getEfficiency = () => {
    if (!optimalScore) return 0;
    return Math.min(100, Math.round((levelScore / optimalScore) * 100));
  };

  return (
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
                 <span className="text-amber-500 font-bold text-xl mt-1">Target: {optimalScore}</span>
              </div>

              {/* Buttons for Daily */}
              <div className="flex gap-2">
                {gameMode === 'DAILY' && (
                  <button
                    onClick={onShareResult}
                    className="ml-2 bg-stone-700 hover:bg-stone-600 text-stone-200 p-2 rounded transition-colors"
                    title="Share Result"
                  >
                    <Share2 size={20} />
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

           {gameMode === 'DAILY' && (
              <div className="mt-4 text-stone-500 text-xs font-serif italic">
                Come back tomorrow for new orders, comrade.
              </div>
           )}

        </div>
      )}
    </div>
  );
};

export default StatusBar;
