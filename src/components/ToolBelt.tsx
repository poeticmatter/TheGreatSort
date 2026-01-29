import React from 'react';
import { GamePhase, ToolInstance } from '../../types';
import { TOOLS } from '../constants';
import ActionButton from './ActionButton';
import UndoButton from './UndoButton';

interface ToolBeltProps {
  toolsAvailable: ToolInstance[];
  selectedTool: string | null;
  shouldShake: boolean;
  phase: GamePhase;
  onToolClick: (toolInstanceId: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  isDisabled?: boolean;
}

const ToolBelt: React.FC<ToolBeltProps & { orientation?: 'horizontal' | 'vertical' }> = ({
  toolsAvailable,
  selectedTool,
  shouldShake,
  phase,
  onToolClick,
  onUndo,
  canUndo,
  isDisabled,
  orientation = 'horizontal',
}) => {
  const containerClasses = orientation === 'vertical'
    ? "flex flex-col gap-3"
    : "flex gap-3 sm:gap-5";

  return (
    <div
      className={`${containerClasses} ${shouldShake ? 'shake-animation' : ''} ${isDisabled ? 'grayscale pointer-events-none opacity-50' : ''} transition-all`}
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
            isDisabled={isUsed || phase !== GamePhase.PLANNING || isDisabled}
            onClick={onToolClick}
          />
        );
      })}

      <UndoButton onClick={onUndo} disabled={!canUndo || isDisabled} />
    </div>
  );
};

export default ToolBelt;
