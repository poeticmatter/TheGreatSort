import React from 'react';
import { ToolsAvailable, GamePhase } from '../../types';
import { TOOLS, TOOLS_DISPLAY_ORDER } from '../constants';
import ActionButton from './ActionButton';

interface ToolBeltProps {
  toolsAvailable: ToolsAvailable;
  selectedTool: string | null;
  shakeTools: number;
  phase: GamePhase;
  onToolClick: (toolId: string) => void;
}

const ToolBelt: React.FC<ToolBeltProps> = ({
  toolsAvailable,
  selectedTool,
  shakeTools,
  phase,
  onToolClick
}) => {
  return (
    <div
      key={shakeTools}
      className={`flex gap-3 sm:gap-5 ${shakeTools > 0 ? 'shake-animation' : ''}`}
    >
      {TOOLS_DISPLAY_ORDER.map(toolKey => {
        const tool = TOOLS[toolKey.toUpperCase()];
        const isUsed = !toolsAvailable[tool.id as keyof ToolsAvailable];
        const isActive = selectedTool === tool.id;

        return (
          <ActionButton
            key={tool.id}
            tool={tool}
            isActive={isActive}
            isUsed={isUsed}
            isDisabled={isUsed || phase !== GamePhase.PLANNING}
            onClick={onToolClick}
          />
        );
      })}
    </div>
  );
};

export default ToolBelt;
