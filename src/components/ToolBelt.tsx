import React from 'react';
import { GamePhase, ToolInstance } from '../../types';
import { TOOLS } from '../constants';
import ActionButton from './ActionButton';

interface ToolBeltProps {
  toolsAvailable: ToolInstance[];
  selectedTool: string | null;
  shouldShake: boolean;
  phase: GamePhase;
  onToolClick: (toolInstanceId: string) => void;
}

const ToolBelt: React.FC<ToolBeltProps> = ({
  toolsAvailable,
  selectedTool,
  shouldShake,
  phase,
  onToolClick,
}) => {
  return (
    <div
      className={`flex gap-3 sm:gap-5 ${shouldShake ? 'shake-animation' : ''}`}
    >
      {toolsAvailable.map((toolInstance) => {
        const toolDef = TOOLS[toolInstance.type.toUpperCase()];
        const isActive = selectedTool === toolInstance.instanceId;
        const isUsed = toolInstance.used;

        return (
          <ActionButton
            key={toolInstance.instanceId}
            tool={toolDef}
            instanceId={toolInstance.instanceId}
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
