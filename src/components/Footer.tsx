import React from 'react';
import { ToolsAvailable, GamePhase, GameMode } from '../../types';
import ToolBelt from './ToolBelt';
import SubmitButton from './SubmitButton';

interface FooterProps {
  phase: GamePhase;
  gameMode: GameMode;
  toolsAvailable: ToolsAvailable;
  selectedTool: string | null;
  shakeTools: number;
  listLength: number;
  onToolClick: (toolId: string) => void;
  onActionClick: () => void;
}

const Footer: React.FC<FooterProps> = ({
  phase, gameMode, toolsAvailable, selectedTool, shakeTools, listLength,
  onToolClick, onActionClick
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
        </div>

      </div>
    </footer>
  );
};

export default Footer;
