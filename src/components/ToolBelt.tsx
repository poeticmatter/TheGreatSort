import React from 'react';
import { GamePhase, ToolInstance } from '../../types';
import { TOOLS } from '../constants';
import ActionButton from './ActionButton';

interface ToolBeltProps {
  toolsAvailable: ToolInstance[];
  selectedTool: string | null;
  shakeTools: number;
  phase: GamePhase;
  onToolClick: (toolInstanceId: string) => void;
  lastUsedToolId?: string;
}

const ToolBelt: React.FC<ToolBeltProps> = ({
  toolsAvailable,
  selectedTool,
  shakeTools,
  phase,
  onToolClick,
  lastUsedToolId
}) => {
  return (
    <div
      key={shakeTools}
      className={`flex gap-3 sm:gap-5 ${shakeTools > 0 ? 'shake-animation' : ''}`}
    >
      {toolsAvailable.map((toolInstance) => {
        const toolDef = TOOLS[toolInstance.type.toUpperCase()];
        const isActive = selectedTool === toolInstance.instanceId;
        const isUsed = toolInstance.used;
        const isUndoable = lastUsedToolId === toolInstance.instanceId;

        return (
          <ActionButton
            key={toolInstance.instanceId}
            tool={toolDef}
            instanceId={toolInstance.instanceId}
            isActive={isActive}
            isUsed={isUsed}
            isDisabled={isUsed && !isUndoable || phase !== GamePhase.PLANNING}
            isUndoable={isUndoable}
            onClick={onToolClick}
          />
        );
      })}
    </div>
  );
};

export default ToolBelt;
