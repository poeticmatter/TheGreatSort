import React from 'react';
import { ToolInstance, GamePhase, GameMode } from '../../types';
import ToolBelt from './ToolBelt';
import SubmitButton from './SubmitButton';
import UndoButton from './UndoButton';

interface FooterProps {
  phase: GamePhase;
  gameMode: GameMode;
  toolsAvailable: ToolInstance[];
  selectedTool: string | null;
  shouldShake: boolean;
  listLength: number;
  onToolClick: (toolId: string) => void;
  onActionClick: () => void;
  onUndo: () => void;
  canUndo: boolean;
  disabled?: boolean;
  isLocked?: boolean;
}

const Footer: React.FC<FooterProps> = ({
  phase, gameMode, toolsAvailable, selectedTool, shouldShake, listLength,
  onToolClick, onActionClick, onUndo, canUndo, disabled, isLocked
}) => {
  return (
    <footer className="p-4 border-t-4 border-red-900 bg-stone-900 pb-8 sm:pb-6 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-20">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">

        <div className={`flex items-center gap-4 ${disabled ? 'grayscale pointer-events-none opacity-50' : ''}`}>
             <UndoButton onClick={onUndo} disabled={!canUndo || disabled} />
             
             <ToolBelt
                toolsAvailable={toolsAvailable}
                selectedTool={selectedTool}
                shouldShake={shouldShake}
                phase={phase}
                onToolClick={onToolClick}
             />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 items-center">
           {/* Unified Action Button */}
           <SubmitButton
             phase={phase}
             gameMode={gameMode}
             listLength={listLength}
             onActionClick={onActionClick}
             disabled={disabled}
             isLocked={isLocked}
           />
        </div>

      </div>
    </footer>
  );
};

export default Footer;
