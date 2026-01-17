import React from 'react';
import {
  ArrowLeftToLine, ArrowRightToLine, Trash2, ArrowRightLeft,
  Play, RotateCcw, Volume2, VolumeX, Star
} from 'lucide-react';
import { ToolDefinition, ToolsAvailable, GamePhase, GameMode } from '../../types';

const TOOLS: Record<string, ToolDefinition> = {
  DEMOTE: { id: 'demote', name: 'Demote', icon: ArrowLeftToLine, desc: 'Move item to the start (Left)' },
  SWAP: { id: 'swap', name: 'Swap', icon: ArrowRightLeft, desc: 'Switch two adjacent items' },
  PURGE: { id: 'purge', name: 'Purge', icon: Trash2, desc: 'Eliminate one item' },
  PROMOTE: { id: 'promote', name: 'Promote', icon: ArrowRightToLine, desc: 'Move item to the end (Right)' },
};

const TOOLS_DISPLAY_ORDER = ['demote', 'swap', 'purge', 'promote'];

interface FooterProps {
  phase: GamePhase;
  gameMode: GameMode;
  toolsAvailable: ToolsAvailable;
  selectedTool: string | null;
  shakeTools: number;
  isPlaying: boolean;
  listLength: number;
  onToolClick: (toolId: string) => void;
  onActionClick: () => void;
  onResetGame: () => void;
  onToggleMusic: () => void;
}

const Footer: React.FC<FooterProps> = ({
  phase, gameMode, toolsAvailable, selectedTool, shakeTools, isPlaying, listLength,
  onToolClick, onActionClick, onResetGame, onToggleMusic
}) => {
  return (
    <footer className="p-4 border-t-4 border-red-900 bg-stone-900 pb-8 sm:pb-6 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-20">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">

        {/* Toolbelt */}
        <div
          key={shakeTools}
          className={`flex gap-3 sm:gap-5 ${shakeTools > 0 ? 'shake-animation' : ''}`}
        >
          {TOOLS_DISPLAY_ORDER.map(toolKey => {
            const tool = TOOLS[toolKey.toUpperCase()];
            const isUsed = !toolsAvailable[tool.id as keyof ToolsAvailable];
            const isActive = selectedTool === tool.id;
            const ToolIcon = tool.icon;

            return (
              <button
                key={tool.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onToolClick(tool.id);
                }}
                disabled={isUsed || phase !== GamePhase.PLANNING}
                title={tool.desc}
                className={`
                  relative flex flex-col items-center justify-center w-16 h-16 rounded transition-all duration-200 group overflow-hidden
                  ${isActive
                    ? 'border-2 border-amber-500 bg-stone-800 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] scale-105'
                    : isUsed
                      ? 'border border-stone-800 bg-stone-950 text-stone-700 cursor-not-allowed opacity-60'
                      : 'border border-stone-600 bg-stone-800 text-stone-400 hover:border-amber-700 hover:text-amber-100 hover:bg-stone-700 hover:-translate-y-1'
                  }
                `}
              >
                <ToolIcon size={24} strokeWidth={2.5} />
                <span className="text-[10px] uppercase font-bold mt-1 tracking-tighter font-[Inter]">{tool.name}</span>

                {/* Used Stamp */}
                {isUsed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-stone-950/70 backdrop-blur-[1px]">
                    <div className="text-red-900 font-black uppercase text-[10px] rotate-[-25deg] border-2 border-red-900 px-1 opacity-80">USED</div>
                  </div>
                )}

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 animate-ping rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 items-center">
           {/* Unified Action Button */}
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

           {gameMode !== 'DAILY' && (
              <button
                onClick={onResetGame}
                className="p-3 text-stone-600 hover:text-red-500 transition-colors border border-transparent hover:border-stone-700 rounded"
                title="Reset Game"
              >
                <RotateCcw size={20} />
              </button>
           )}

           <button
            onClick={onToggleMusic}
            className={`p-3 transition-colors border border-transparent hover:border-stone-700 rounded ${isPlaying ? 'text-amber-500' : 'text-stone-600 hover:text-amber-500'}`}
            title={isPlaying ? "Mute Music" : "Play Music"}
           >
             {isPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}
           </button>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
