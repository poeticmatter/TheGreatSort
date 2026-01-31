import React from 'react';
import { LucideIcon } from 'lucide-react';
import { ToolInstance, GamePhase, GameMode } from '../../types';
import ToolBelt from './ToolBelt';
import SubmitButton from './SubmitButton';
import { ButtonVariant } from '../config/submitButtonConfig';
// import UndoButton from './UndoButton'; // Moved to ToolBelt
import { LayoutType } from './InventoryGrid';

interface FooterProps {
  phase: GamePhase;
  gameMode: GameMode;
  toolsAvailable: ToolInstance[];
  selectedTool: string | null;
  shouldShake: boolean;
  listLength: number;
  onToolClick: (toolId: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  disabled?: boolean;
  layout: LayoutType;
  submitConfig: {
    label: string;
    variant: ButtonVariant;
    Icon: LucideIcon;
    onClick: () => void;
  };
}

const Footer: React.FC<FooterProps> = ({
  phase, gameMode, toolsAvailable, selectedTool, shouldShake, listLength,
  onToolClick, onUndo, canUndo, disabled, layout, submitConfig
}) => {
  // Controls are disabled if global disable is on OR if we are not in the planning phase (Inspection/Results)
  const controlsDisabled = disabled || phase !== GamePhase.PLANNING;

  if (layout === 'VERTICAL_LIST') return null;

  const toolBeltContent = (
    <ToolBelt
      toolsAvailable={toolsAvailable}
      selectedTool={selectedTool}
      shouldShake={shouldShake}
      phase={phase}
      onToolClick={onToolClick}
      orientation={layout === 'VERTICAL_LIST' ? 'vertical' : 'horizontal'}
      onUndo={onUndo}
      canUndo={canUndo}
      isDisabled={controlsDisabled}
    />
  );

  return (
    <>
      {/* Footer Container */}
      <footer className="p-4 border-t-4 border-red-900 bg-stone-900 pb-8 sm:pb-6 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-20 relative">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">

          <div className={`flex items-center gap-4 ${controlsDisabled && layout === 'HORIZONTAL_STRIP' ? 'grayscale pointer-events-none opacity-50' : ''}`}>
            {/* Show ToolBelt here ONLY if Horizontal Strip (Default) */}
            {layout === 'HORIZONTAL_STRIP' && toolBeltContent}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 items-center">
            {/* Unified Action Button */}
            <SubmitButton
              label={submitConfig.label}
              variant={submitConfig.variant}
              Icon={submitConfig.Icon}
              onClick={submitConfig.onClick}
              disabled={disabled}
              compact={false}
            />
          </div>

        </div>
      </footer>

      {/* Floating ToolBelt for Vertical Layout */}
      {layout === 'VERTICAL_LIST' && (
        <div className={`
            fixed right-4 top-1/2 -translate-y-1/2 z-40 p-2 
            bg-stone-900/50 backdrop-blur-sm rounded-xl border border-stone-700/50 shadow-xl
            ${controlsDisabled ? 'grayscale pointer-events-none opacity-50' : ''}
         `}>
          {toolBeltContent}
        </div>
      )}
    </>
  );
};

export default Footer;
