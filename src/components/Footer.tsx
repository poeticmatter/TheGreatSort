import React from 'react';
import { RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { ToolsAvailable, GamePhase, GameMode } from '../../types';
import ToolBelt from './ToolBelt';
import SubmitButton from './SubmitButton';

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
        <ToolBelt
          toolsAvailable={toolsAvailable}
          selectedTool={selectedTool}
          shakeTools={shakeTools}
          phase={phase}
          onToolClick={onToolClick}
        />

        {/* Action Buttons */}
        <div className="flex gap-4 items-center">
           {/* Unified Action Button */}
           <SubmitButton
             phase={phase}
             gameMode={gameMode}
             listLength={listLength}
             onActionClick={onActionClick}
           />

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
